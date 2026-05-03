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
