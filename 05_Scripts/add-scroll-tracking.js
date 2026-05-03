#!/usr/bin/env node
/**
 * BNotes add-scroll-tracking.js — 批量為所有文章注入 GA4 Scroll Depth 追蹤
 *
 * 問題：現有 74 篇文章缺乏 scroll depth 事件追蹤
 *       GA4 無法偵測讀者在哪裡流失
 *
 * 用法：node 05_Scripts/add-scroll-tracking.js [--dry-run] [--slug <slug>]
 *   --dry-run   只報告，不寫入
 *   --slug xxx  只處理單篇（測試用）
 *
 * 策略：
 *   1. 在 bnotes-v3-js script 內的進度條程式碼後，注入 scroll depth 事件
 *   2. 追蹤 25% / 50% / 75% / 100% 四個里程碑
 *   3. 同步更新 dist/articles/ 和 08_文章_Articles_HTML/ 雙份
 *   4. 若已含 scroll_depth 追蹤，自動跳過（冪等）
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const DIST_ART  = path.join(ROOT, 'dist', 'articles');
const DRAFTS    = path.join(ROOT, '08_文章_Articles_HTML');

const DRY_RUN    = process.argv.includes('--dry-run');
const targetSlug = (() => {
  const i = process.argv.indexOf('--slug');
  return i !== -1 ? process.argv[i + 1] : null;
})();

// ── Scroll Depth 追蹤程式碼（注入到 bnotes-v3-js 的進度條程式碼後）──────────
// 使用 passive 監聽器 + once-per-milestone 節流，確保效能
const SCROLL_TRACKING_CODE = `
  /* ── Scroll Depth GA4 Events ── */
  (function(){
    if(typeof gtag !== 'function')return;
    var milestones={25:false,50:false,75:false,100:false};
    var ticking=false;
    function checkScroll(){
      ticking=false;
      var scrolled=window.scrollY+window.innerHeight;
      var total=document.documentElement.scrollHeight;
      if(total<=0)return;
      var pct=Math.round(scrolled/total*100);
      [25,50,75,100].forEach(function(m){
        if(!milestones[m]&&pct>=m){
          milestones[m]=true;
          gtag('event','scroll_depth',{
            'event_category':'engagement',
            'event_label':m+'%',
            'value':m,
            'non_interaction':m<100
          });
        }
      });
    }
    window.addEventListener('scroll',function(){
      if(!ticking){ticking=true;requestAnimationFrame(checkScroll);}
    },{passive:true});
    checkScroll();
  })();`;

// 注入標記（用於冪等檢查）
const INJECTION_MARKER = 'scroll_depth';

// 注入點：在進度條程式碼（bnotes-progress）後
const INJECTION_ANCHOR = `pb.id='bnotes-progress';
  document.body.prepend(pb);`;

// ── 工具函式 ──────────────────────────────────────────────────────────────────

function injectScrollTracking(html) {
  // 冪等：已含追蹤則跳過
  if (html.includes(INJECTION_MARKER)) {
    return { html, changed: false, reason: 'already_tracked' };
  }

  // 找注入點
  if (!html.includes(INJECTION_ANCHOR)) {
    return { html, changed: false, reason: 'anchor_not_found' };
  }

  const newHtml = html.replace(
    INJECTION_ANCHOR,
    INJECTION_ANCHOR + '\n' + SCROLL_TRACKING_CODE
  );

  return { html: newHtml, changed: true, reason: 'injected' };
}

// ── 主程式 ────────────────────────────────────────────────────────────────────

const files = fs.readdirSync(DIST_ART)
  .filter(f => f.endsWith('.html') && f !== 'index.html')
  .filter(f => !targetSlug || f === `${targetSlug}.html`);

console.log(`\n🔍  BNotes Scroll Tracking 注入工具`);
console.log(`    模式：${DRY_RUN ? 'Dry Run（僅報告）' : '寫入模式'}`);
console.log(`    掃描：${files.length} 篇文章\n`);

let injected   = 0;
let skipped    = 0;
let noAnchor   = 0;

for (const file of files) {
  const slug      = file.replace('.html', '');
  const distPath  = path.join(DIST_ART, file);
  const draftPath = path.join(DRAFTS, file);

  const distHtml = fs.readFileSync(distPath, 'utf8');
  const { html: newHtml, changed, reason } = injectScrollTracking(distHtml);

  if (!changed) {
    if (reason === 'already_tracked') {
      skipped++;
    } else {
      noAnchor++;
      console.log(`  ⚠️  ${slug} — 找不到注入點 (bnotes-v3-js 結構不符)`);
    }
    continue;
  }

  injected++;
  console.log(`  ✅  ${slug} — 注入 scroll depth 追蹤`);

  if (!DRY_RUN) {
    fs.writeFileSync(distPath, newHtml, 'utf8');

    // 同步更新草稿版本
    if (fs.existsSync(draftPath)) {
      const draftHtml = fs.readFileSync(draftPath, 'utf8');
      const { html: newDraft, changed: draftChanged } = injectScrollTracking(draftHtml);
      if (draftChanged) fs.writeFileSync(draftPath, newDraft, 'utf8');
    }
  }
}

console.log(`\n📊  結果`);
console.log(`    注入：${injected} 篇`);
console.log(`    已有追蹤（跳過）：${skipped} 篇`);
console.log(`    找不到注入點：${noAnchor} 篇`);
console.log(`    總計：${files.length} 篇`);

if (DRY_RUN && injected > 0) {
  console.log(`\n⚠️   Dry Run 模式，未寫入。執行不含 --dry-run 以實際注入。`);
}

if (!DRY_RUN && injected > 0) {
  console.log(`\n✅  寫入完成`);
  console.log(`\n🚀  建議執行：`);
  console.log(`    git add -f dist/articles/ 08_文章_Articles_HTML/`);
  console.log(`    git commit -m "feat(analytics): 批量注入 GA4 scroll depth 追蹤（${injected} 篇）"`);
  console.log(`    git push origin main`);
}
