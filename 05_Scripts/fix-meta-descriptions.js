#!/usr/bin/env node
/**
 * BNotes fix-meta-descriptions.js — 批量修復 meta description 品質
 *
 * 問題：63 篇文章 meta description 超過 Google 顯示上限（約 50 中文字 / 160 bytes）
 *       部分文章含 emoji、bullet points、截斷句等 SEO 禁忌格式
 *
 * 用法：node 05_Scripts/fix-meta-descriptions.js [--dry-run] [--slug <slug>]
 *   --dry-run   只報告，不寫入
 *   --slug xxx  只處理單篇文章（測試用）
 *
 * 策略：
 *   1. 移除 emoji、控制字元、Markdown 語法殘留
 *   2. 若長度 > 80 字，在最近的句號/逗號/空白處截斷，補「…」
 *   3. 目標：40–60 中文字（Google 顯示上限 ≈ 50 中文字）
 *   4. 同步更新 dist/articles/ 和 08_文章_Articles_HTML/ 雙份
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const DIST_ART   = path.join(ROOT, 'dist', 'articles');
const DRAFTS     = path.join(ROOT, '08_文章_Articles_HTML');

const DRY_RUN = process.argv.includes('--dry-run');
const targetSlug = (() => {
  const i = process.argv.indexOf('--slug');
  return i !== -1 ? process.argv[i + 1] : null;
})();

// ── 工具函式 ──────────────────────────────────────────────

// 計算「顯示長度」：中文字 = 1，ASCII = 0.5（Google 換算基準）
function displayLen(str) {
  let len = 0;
  for (const ch of str) {
    len += ch.codePointAt(0) > 127 ? 1 : 0.5;
  }
  return len;
}

// 清理非法內容
function cleanMeta(raw) {
  return raw
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // emoji（補充平面）
    .replace(/[☀-➿]/g, '')           // misc symbols & dingbats
    .replace(/[•·●▶▸]/g, '')                  // bullet points
    .replace(/\s*KeyTakeaways\s*/g, '')        // 殘留標題
    .replace(/\s+/g, ' ')                      // 多空白合一
    .trim();
}

// 截斷至目標顯示長度，在自然邊界切
function truncate(str, maxDisplay = 55) {
  if (displayLen(str) <= maxDisplay) return str;

  // 嘗試在句號/問號/感嘆號前截斷
  const sentences = str.match(/[^。！？.!?]+[。！？.!?]?/g) || [str];
  let result = '';
  for (const s of sentences) {
    if (displayLen(result + s) > maxDisplay) break;
    result += s;
  }

  // 若第一句就超長，在逗號/空白截
  if (!result) {
    let cur = '';
    for (const ch of str) {
      if (displayLen(cur + ch) > maxDisplay) break;
      cur += ch;
    }
    // 往前找逗號或空格
    const lastPunct = Math.max(cur.lastIndexOf('，'), cur.lastIndexOf('、'), cur.lastIndexOf(' '), cur.lastIndexOf('，'));
    result = lastPunct > maxDisplay * 0.6 ? cur.slice(0, lastPunct) : cur;
  }

  return result.replace(/[，、,\s]+$/, '') + '…';
}

// 從 HTML 字串提取並重寫 meta description
function fixMetaInHtml(html, slug) {
  const metaRe = /(<meta\s+name="description"\s+content=")([^"]*?)("\s*\/?>)/i;
  const match = html.match(metaRe);
  if (!match) return { html, changed: false, before: null, after: null };

  const raw    = match[2];
  const clean  = cleanMeta(raw);
  const fixed  = truncate(clean, 55);

  const changed = fixed !== raw;
  const newHtml = changed ? html.replace(metaRe, `$1${fixed}$3`) : html;

  return { html: newHtml, changed, before: raw, after: fixed };
}

// ── 主程式 ────────────────────────────────────────────────

const files = fs.readdirSync(DIST_ART)
  .filter(f => f.endsWith('.html'))
  .filter(f => !targetSlug || f === `${targetSlug}.html`);

console.log(`\n🔍  BNotes Meta Description 修復工具`);
console.log(`    模式：${DRY_RUN ? 'Dry Run（僅報告）' : '寫入模式'}`);
console.log(`    掃描：${files.length} 篇文章\n`);

let fixedCount = 0;
let skipCount  = 0;
const report   = [];

for (const file of files) {
  const slug   = file.replace('.html', '');
  const distPath  = path.join(DIST_ART, file);
  const draftPath = path.join(DRAFTS, file);

  const distHtml = fs.readFileSync(distPath, 'utf8');
  const { html: fixedHtml, changed, before, after } = fixMetaInHtml(distHtml, slug);

  if (!changed) {
    skipCount++;
    continue;
  }

  fixedCount++;
  const beforeLen = Math.round(displayLen(before));
  const afterLen  = Math.round(displayLen(after));
  console.log(`  ✏️  ${slug}`);
  console.log(`     前 (${beforeLen}字): ${before.substring(0, 60)}${before.length > 60 ? '…' : ''}`);
  console.log(`     後 (${afterLen}字): ${after}\n`);

  report.push({ slug, before, after });

  if (!DRY_RUN) {
    // 更新 dist/articles/
    fs.writeFileSync(distPath, fixedHtml, 'utf8');

    // 同步更新 08_文章_Articles_HTML/（含 frontmatter）
    if (fs.existsSync(draftPath)) {
      const draftHtml = fs.readFileSync(draftPath, 'utf8');
      const { html: fixedDraft, changed: draftChanged } = fixMetaInHtml(draftHtml, slug);
      if (draftChanged) fs.writeFileSync(draftPath, fixedDraft, 'utf8');
    }
  }
}

console.log(`\n📊  結果`);
console.log(`    修復：${fixedCount} 篇`);
console.log(`    已達標：${skipCount} 篇`);
console.log(`    總計：${files.length} 篇`);

if (DRY_RUN && fixedCount > 0) {
  console.log(`\n⚠️   Dry Run 模式，未寫入。執行不含 --dry-run 以實際修復。`);
}

if (!DRY_RUN && fixedCount > 0) {
  console.log(`\n✅  寫入完成`);
  console.log(`\n🚀  建議執行：`);
  console.log(`    git add -f dist/articles/ 08_文章_Articles_HTML/`);
  console.log(`    git commit -m "fix(seo): 批量修復 ${fixedCount} 篇 meta description 超長問題"`);
  console.log(`    git push origin main`);
}
