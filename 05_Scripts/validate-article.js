#!/usr/bin/env node
/**
 * BNotes Article Validator v1.0
 * 發布前必跑。8 項檢查，BLOCK 項不通過則阻擋 publish.js。
 * Usage: node validate-article.js <slug>
 *        node validate-article.js brazil-natural-process-guide
 */

const fs   = require('fs');
const path = require('path');

const VALID_CATS = ['手沖技法', '產地風土', '器材評測', '沖泡科學', '義式咖啡', '咖啡生活'];
const ARTICLES_DIR = path.join(__dirname, '../08_文章_Articles_HTML');

const slug = process.argv[2];
if (!slug) {
  console.error('❌ 請提供 slug：node validate-article.js <slug>');
  process.exit(1);
}

const filePath = path.join(ARTICLES_DIR, `${slug}.html`);
if (!fs.existsSync(filePath)) {
  console.error(`❌ 找不到檔案：${filePath}`);
  process.exit(1);
}

const html = fs.readFileSync(filePath, 'utf8');

let blocks = 0;
let warns  = 0;

function check(label, level, condition, detail = '') {
  const icon  = condition ? '✅' : (level === 'BLOCK' ? '🔴' : '🟡');
  const badge = condition ? '' : ` [${level}]`;
  console.log(`${icon}${badge} ${label}${detail && !condition ? ' — ' + detail : ''}`);
  if (!condition) {
    if (level === 'BLOCK') blocks++;
    else warns++;
  }
}

console.log(`\n🔍 BNotes Article Validator — ${slug}\n${'─'.repeat(50)}`);

// ── BLOCK 項（未過則阻擋發布）──────────────────────────
check(
  'bnotes-v3 CSS 存在',
  'BLOCK',
  html.includes('id="bnotes-v3"'),
  '缺少 <style id="bnotes-v3">，版面與 logo 將不一致'
);

check(
  'Nav Logo 標準結構',
  'BLOCK',
  html.includes('class="nav-logo"') && html.includes('<b>B</b>Notes'),
  '應使用 <a class="nav-logo"><b>B</b>Notes...</a> 標準格式'
);

const catMatch = html.match(/cat:\s*(.+)/);
const cat = catMatch ? catMatch[1].trim() : '';
check(
  `分類合法（目前：${cat || '未填'}）`,
  'BLOCK',
  VALID_CATS.includes(cat),
  `合法分類：${VALID_CATS.join(' / ')}`
);

check(
  '未填入的 {{PLACEHOLDER}} 欄位',
  'BLOCK',
  !html.includes('{{'),
  '仍有未替換的佔位欄位'
);

// ── BLOCK 項：審核留痕（v1.7 規範）────────────────────
// frontmatter 格式：YAML（--- 包圍）
// b1_reviewed_at / gm_approved_at 須存在且為 ISO 8601 時間戳，且 b1 < gm
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)$/;

// [^\S\r\n]* 只匹配行內空白（不含換行），確保不跨行；
// [^\r\n]* 抓行內剩餘值（允許空值）
// 若欄位行完全不存在則 match 回 null
const b1Match  = html.match(/^b1_reviewed_at:[^\S\r\n]*([^\r\n]*)/m);
const gmMatch  = html.match(/^gm_approved_at:[^\S\r\n]*([^\r\n]*)/m);
const b1Raw    = b1Match  ? b1Match[1].trim()  : '';
const gmRaw    = gmMatch  ? gmMatch[1].trim()  : '';
const b1Valid  = ISO8601_RE.test(b1Raw);
const gmValid  = ISO8601_RE.test(gmRaw);
const seqValid = b1Valid && gmValid && (new Date(b1Raw) < new Date(gmRaw));

check(
  `b1_reviewed_at 存在且格式正確（目前：${b1Raw || '未填'}）`,
  'BLOCK',
  b1Valid,
  'B1 審核時間戳缺失或格式錯誤，應為 ISO 8601，例：2026-05-05T14:00:00+08:00'
);

check(
  `gm_approved_at 存在且格式正確（目前：${gmRaw || '未填'}）`,
  'BLOCK',
  gmValid,
  'GM 終審時間戳缺失或格式錯誤，應為 ISO 8601，例：2026-05-05T16:00:00+08:00'
);

check(
  `審核時序正確（b1_reviewed_at < gm_approved_at）`,
  'BLOCK',
  seqValid,
  `時序錯誤：B1 審核（${b1Raw}）必須早於 GM 終審（${gmRaw}）`
);

// ── WARN 項（提示但不阻擋）──────────────────────────────
check(
  'H1 標題存在',
  'WARN',
  /<h1[\s>]/.test(html),
  '文章缺少 H1，v3-js 無法注入統一標題'
);

check(
  'Affiliate 聯盟連結（≥2 個）',
  'WARN',
  (html.match(/href="\/re\//g) || []).length >= 2,
  `目前 /re/ 連結數：${(html.match(/href="\/re\//g) || []).length}`
);

check(
  'References 參考資料區塊',
  'WARN',
  html.includes('class="references"'),
  '缺少 .references 區塊'
);

check(
  'Share Section 分享區',
  'WARN',
  html.includes('class="share-section"'),
  '缺少 .share-section 區塊'
);

// ── WARN 項（內容層 — 編輯五律）────────────────────────
// 取出 <article> 或 <main> 內第一個 <p> 作為場景開頭偵測
const firstParaMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
const firstPara = firstParaMatch ? firstParaMatch[1].replace(/<[^>]+>/g, '') : '';
const startsWithBadPattern = /^根據|^[\d０-９]|^According|^研究顯示|^研究表明|^數據|^統計/.test(firstPara.trim());
check(
  '場景開頭（非數據/非「根據」開頭）',
  'WARN',
  firstPara.length > 0 && !startsWithBadPattern,
  `首段開頭疑似數據或分析語句：「${firstPara.substring(0,30)}…」`
);

const authorPresent = (html.match(/我[^們的是]|我的|我在|我用|我曾|我第一次|我試|我喝/g) || []).length >= 1;
check(
  '作者在場（至少 1 處「我」的視角）',
  'WARN',
  authorPresent,
  '全文未偵測到作者第一人稱語句（我…）'
);

const sensoryWords = ['香氣', '酸味', '苦味', '甜感', '口感', '餘韻', '尾韻', '滑順', '厚實', '清亮',
  '焦糖', '果香', '花香', '煙燻', '木質', '堅果', '巧克力', '柑橘', '莓果', '茉莉',
  '聞到', '嚐到', '感受', '入口', '喉韻'];
const sensoryCount = sensoryWords.filter(w => html.includes(w)).length;
check(
  `感官描寫（≥3 個感官詞彙，目前：${sensoryCount}）`,
  'WARN',
  sensoryCount >= 3,
  `感官詞彙不足：${sensoryWords.filter(w => html.includes(w)).join('、') || '無'}`
);

check(
  'Geo-box / FAQ 區塊',
  'WARN',
  html.includes('class="geo-box"') || html.includes('class="faq-section"') || html.includes('"@type":"FAQPage"'),
  '缺少 .geo-box 或 .faq-section（地理/產地文章建議加入）'
);

const closingH2 = /<h2[^>]*>[^<]*(?:結語|總結|最後|下一步|你的|試試|邀請|一杯)[^<]*<\/h2>/i.test(html);
check(
  '結語 H2 標題存在',
  'WARN',
  closingH2,
  '缺少結語 H2（應含「結語/最後/邀請/試試」等結尾詞）'
);

// ── 結果 ────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
if (blocks > 0) {
  console.log(`\n🔴 驗證失敗：${blocks} 個 BLOCK 項未通過，${warns} 個警告`);
  console.log('   請修復 BLOCK 項後重新執行 validate-article.js\n');
  process.exit(1);
} else if (warns > 0) {
  console.log(`\n🟡 驗證通過（含 ${warns} 個警告）— GM 人工確認後可發布\n`);
  process.exit(0);
} else {
  console.log('\n✅ 驗證完全通過 — 可執行 publish.js\n');
  process.exit(0);
}
