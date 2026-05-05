#!/usr/bin/env node
/**
 * BNotes inject-ga4-events.js — 批量注入 GA4 核心事件追蹤
 *
 * 任務要求（B9 2026-05-05）：
 *   affiliate_click     — 點擊 href 以 /re/ 開頭的聯盟連結
 *   faq_expand          — 點擊展開 FAQ 區塊的 <details> 或 .faq-item
 *   article_read_complete — 80% scroll（已全部部署，本腳本跳過）
 *   search_query        — Pagefind 尚未部署，暫無觸發點，本腳本跳過
 *
 * 用法：
 *   node 05_Scripts/inject-ga4-events.js [--dry-run] [--slug <slug>]
 *   --dry-run   只報告，不寫入
 *   --slug xxx  只處理單篇（測試用）
 *
 * 冪等：已含對應事件的文章自動跳過。
 * 雙份更新：同步更新 dist/articles/ 與 08_文章_Articles_HTML/。
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const DIST_ART = path.join(ROOT, 'dist', 'articles');
const DRAFTS   = path.join(ROOT, '08_文章_Articles_HTML');

const DRY_RUN    = process.argv.includes('--dry-run');
const targetSlug = (() => {
  const i = process.argv.indexOf('--slug');
  return i !== -1 ? process.argv[i + 1] : null;
})();

// ── 注入標記（冪等檢查用）─────────────────────────────────────────────────────
const MARKER_AFFILIATE = 'bnotes-ga4-affiliate';
const MARKER_FAQ       = 'bnotes-ga4-faq';

// ── 注入點：</body> 前 ────────────────────────────────────────────────────────
const INJECTION_ANCHOR = '</body>';

// ── affiliate_click 追蹤程式碼 ────────────────────────────────────────────────
// 策略：event delegation 於 document，不依賴 affiliate-link class，
// 判斷 href 以 /re/ 開頭即為聯盟連結（與既有 brewing-diagnosis-w01 邏輯一致）
const AFFILIATE_TRACKING = `<script>
/* ${MARKER_AFFILIATE} */
(function(){
  if(typeof gtag!=='function')return;
  document.addEventListener('click',function(e){
    var el=e.target.closest('a');
    if(!el)return;
    var href=el.getAttribute('href')||'';
    if(href.startsWith('/re/')){
      gtag('event','affiliate_click',{
        'event_category':'monetization',
        'affiliate_product':href.replace('/re/',''),
        'link_text':(el.textContent||'').trim().substring(0,100),
        'page_title':document.title
      });
    }
  });
})();
</script>
`;

// ── faq_expand 追蹤程式碼 ─────────────────────────────────────────────────────
// 支援兩種常見 FAQ 實作：
// 1. <details>/<summary> 原生展開（toggle 事件）
// 2. .faq-item 按鈕點擊（click 事件 on .faq-question 或 .faq-item h3/h4）
const FAQ_TRACKING = `<script>
/* ${MARKER_FAQ} */
(function(){
  if(typeof gtag!=='function')return;
  // 原生 <details> 展開
  document.querySelectorAll('details').forEach(function(el){
    el.addEventListener('toggle',function(){
      if(el.open){
        var q=(el.querySelector('summary')||el).textContent.trim().substring(0,100);
        gtag('event','faq_expand',{
          'event_category':'content_interaction',
          'faq_question':q,
          'page_title':document.title
        });
      }
    });
  });
  // .faq-item 按鈕點擊（自訂 accordion 元件）
  document.querySelectorAll('.faq-question, .faq-item > h3, .faq-item > h4').forEach(function(el){
    el.addEventListener('click',function(){
      var q=el.textContent.trim().substring(0,100);
      gtag('event','faq_expand',{
        'event_category':'content_interaction',
        'faq_question':q,
        'page_title':document.title
      });
    });
  });
})();
</script>
`;

// ── 工具函式 ──────────────────────────────────────────────────────────────────

function injectEvents(html) {
  // 冪等檢查：若已含標記 OR 已有任何形式的 affiliate_click 事件，則跳過 affiliate 注入
  const needAffiliate = !html.includes(MARKER_AFFILIATE) && !html.includes("'affiliate_click'") && !html.includes('"affiliate_click"');
  const needFaq       = !html.includes(MARKER_FAQ);

  if (!needAffiliate && !needFaq) {
    return { html, changed: false, reason: 'already_tracked' };
  }

  if (!html.includes(INJECTION_ANCHOR)) {
    return { html, changed: false, reason: 'no_body_tag' };
  }

  let injection = '';
  if (needAffiliate) injection += AFFILIATE_TRACKING;
  if (needFaq)       injection += FAQ_TRACKING;

  const newHtml = html.replace(INJECTION_ANCHOR, injection + INJECTION_ANCHOR);

  return {
    html: newHtml,
    changed: true,
    injectedAffiliate: needAffiliate,
    injectedFaq: needFaq,
  };
}

// ── 主程式 ────────────────────────────────────────────────────────────────────

const files = fs.readdirSync(DIST_ART)
  .filter(f => f.endsWith('.html') && f !== 'index.html')
  .filter(f => !targetSlug || f === `${targetSlug}.html`);

console.log(`\nBNotes GA4 Events 注入工具`);
console.log(`    模式：${DRY_RUN ? 'Dry Run（僅報告）' : '寫入模式'}`);
console.log(`    掃描：${files.length} 篇文章\n`);
console.log(`    注意：article_read_complete 已全部部署，跳過`);
console.log(`    注意：search_query 需 Pagefind 上線後再部署，跳過\n`);

let injected   = 0;
let skipped    = 0;
let noAnchor   = 0;
let affiliateCount = 0;
let faqCount       = 0;

for (const file of files) {
  const slug      = file.replace('.html', '');
  const distPath  = path.join(DIST_ART, file);
  const draftPath = path.join(DRAFTS, file);

  const distHtml = fs.readFileSync(distPath, 'utf8');
  const result   = injectEvents(distHtml);

  if (!result.changed) {
    if (result.reason === 'already_tracked') {
      skipped++;
    } else {
      noAnchor++;
      console.log(`  WARN  ${slug} — 找不到 </body>（跳過）`);
    }
    continue;
  }

  injected++;
  const events = [];
  if (result.injectedAffiliate) { events.push('affiliate_click'); affiliateCount++; }
  if (result.injectedFaq)       { events.push('faq_expand');       faqCount++;       }
  console.log(`  OK  ${slug} — 注入：${events.join(', ')}`);

  if (!DRY_RUN) {
    fs.writeFileSync(distPath, result.html, 'utf8');

    // 同步更新草稿版本
    if (fs.existsSync(draftPath)) {
      const draftHtml = fs.readFileSync(draftPath, 'utf8');
      const draftResult = injectEvents(draftHtml);
      if (draftResult.changed) fs.writeFileSync(draftPath, draftResult.html, 'utf8');
    }
  }
}

console.log(`\n結果`);
console.log(`    注入篇數：${injected}`);
console.log(`    affiliate_click 新增：${affiliateCount} 篇`);
console.log(`    faq_expand 新增：${faqCount} 篇`);
console.log(`    已有追蹤（跳過）：${skipped} 篇`);
console.log(`    找不到 </body>：${noAnchor} 篇`);

if (DRY_RUN && injected > 0) {
  console.log(`\nDry Run 模式，未寫入。移除 --dry-run 以實際注入。`);
}

if (!DRY_RUN && injected > 0) {
  console.log(`\n寫入完成`);
  console.log(`\n建議執行：`);
  console.log(`    git add -f dist/articles/ 08_文章_Articles_HTML/`);
  console.log(`    git commit -m "feat(analytics): 批量注入 GA4 affiliate_click / faq_expand（${injected} 篇）"`);
  console.log(`    git push origin main`);
}
