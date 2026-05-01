#!/usr/bin/env node
/**
 * BNotes publish.js — B9 文章發布腳本 v1.0
 *
 * 用法：node publish.js <slug>
 *
 * 流程：
 *   1. 讀取 08_文章_Articles_HTML/<slug>.html（草稿）
 *   2. 剝離 HTML comment frontmatter <!-- ... -->
 *   3. 抽取 title / date / cat / desc 供 index.html 卡片使用
 *   4. 寫入 dist/articles/<slug>.html
 *   5. 將新文章卡片插入 dist/index.html 第一位（最新在前）
 *   6. 舊第 9 張卡片自動降入 SLUGS 動態列表
 *   7. 更新草稿 frontmatter status: ready → published
 *   8. 印出建議的 git commit 指令
 */

const fs   = require('fs');
const path = require('path');

// ── 路徑設定 ───────────────────────────────────────────────
const ROOT      = path.resolve(__dirname, '..');
const DRAFTS    = path.join(ROOT, '08_文章_Articles_HTML');
const DIST_ART  = path.join(ROOT, 'dist', 'articles');
const INDEX     = path.join(ROOT, 'dist', 'index.html');

// ── 主程式 ─────────────────────────────────────────────────
const slug = process.argv[2];
if (!slug) {
  console.error('❌  用法：node publish.js <slug>');
  console.error('    範例：node publish.js wbc-2026-champion-philosophy');
  process.exit(1);
}

const draftPath = path.join(DRAFTS,   `${slug}.html`);
const distPath  = path.join(DIST_ART, `${slug}.html`);

if (!fs.existsSync(draftPath)) {
  console.error(`❌  找不到草稿：${draftPath}`);
  process.exit(1);
}

// ── 1. 讀取草稿 ────────────────────────────────────────────
let content = fs.readFileSync(draftPath, 'utf8');

// ── 2. 抽取 frontmatter 欄位 ───────────────────────────────
const fm = {};
const fmMatch = content.match(/<!--\s*\n([\s\S]*?)\n\s*-->/);
if (fmMatch) {
  fmMatch[1].split('\n').forEach(line => {
    const m = line.match(/^\s*(\w+)\s*:\s*(.+)/);
    if (m) fm[m[1].trim()] = m[2].trim();
  });
}

// ── 3. 從 HTML meta 補充缺少的欄位 ────────────────────────
function metaContent(html, prop) {
  const m = html.match(new RegExp(`(?:name|property)="${prop}"[^>]*content="([^"]+)"`))
         || html.match(new RegExp(`content="([^"]+)"[^>]*(?:name|property)="${prop}"`));
  return m ? m[1] : '';
}
const title = fm.title || metaContent(content, 'og:title') || metaContent(content, 'title') || slug;
const date  = fm.date  || metaContent(content, 'article:published_time').substring(0,10) || new Date().toISOString().substring(0,10);
const cat   = fm.cat   || (() => {
  const m = content.match(/class="article-cat[^"]*">([^<]+)</);
  return m ? m[1].replace(/^[^\w]+\s*/,'').trim() : '沖泡科學';
})();
const desc  = fm.desc  || metaContent(content, 'og:description') || metaContent(content, 'description') || '';
const heroImg = `/images/ai/${slug}-hero.jpg`;

console.log(`\n📄  文章資訊`);
console.log(`    slug : ${slug}`);
console.log(`    title: ${title.substring(0,50)}`);
console.log(`    date : ${date}`);
console.log(`    cat  : ${cat}`);
console.log(`    desc : ${desc.substring(0,60)}`);

// ── 4. 剝離 frontmatter，寫入 dist/ ───────────────────────
const published = content.replace(/<!--\s*\n[\s\S]*?\n\s*-->\n?/, '');
fs.writeFileSync(distPath, published, 'utf8');
console.log(`\n✅  已寫入：dist/articles/${slug}.html`);

// ── 5. 更新 dist/index.html ────────────────────────────────
let idx = fs.readFileSync(INDEX, 'utf8');

// 5a. 若已存在此 slug 的卡片，跳過插入
if (idx.includes(`/articles/${slug}.html`)) {
  console.log(`ℹ️   index.html 已含此文章，跳過卡片插入`);
} else {
  // 5b. 建立新卡片 HTML
  const loading = 'eager';   // 最新文章用 eager
  const card = `<article class="card"><a href="/articles/${slug}.html" aria-label="${title}"><div class="card-img-wrap"><img class="card-img" src="${heroImg}" data-fallback="/images/ai/alishan-new-crop-w02-hero.jpg" alt="${title}" loading="${loading}"><span class="card-cat">${cat}</span></div></a><div class="card-body"><div class="card-meta"><span>${date}</span></div><h3 class="card-title"><a href="/articles/${slug}.html">${title}</a></h3><p class="card-desc">${desc}</p></div></article>`;

  // 5c. 找 latest-grid 內第一張卡並在前面插入
  const gridStart = idx.indexOf('id="latest-grid"');
  if (gridStart === -1) {
    console.warn('⚠️   找不到 #latest-grid，請手動更新 index.html');
  } else {
    const firstCard = idx.indexOf('<article class="card">', gridStart);
    if (firstCard === -1) {
      console.warn('⚠️   找不到第一張卡片，請手動更新 index.html');
    } else {
      idx = idx.slice(0, firstCard) + '\n      ' + card + '\n      ' + idx.slice(firstCard);

      // 5d. 計算 hardcoded 卡片數，若超過 9 張，把最後一張降入 SLUGS
      const cards = [...idx.matchAll(/<article class="card">/g)];
      const gridEnd = idx.indexOf('</div>\n    <div id="load-more-wrap"');
      const gridContent = idx.slice(gridStart, gridEnd);
      const gridCards = [...gridContent.matchAll(/<article class="card">/g)];

      if (gridCards.length > 9) {
        // 找最後一張卡，取其 slug，移入 SLUGS
        const lastCardMatches = [...gridContent.matchAll(/href="\/articles\/([^"]+)\.html"/g)];
        const lastSlug = lastCardMatches[lastCardMatches.length - 1]?.[1];

        if (lastSlug) {
          // 找最後一張完整 card HTML 並刪除
          const lastCardIdx = gridContent.lastIndexOf('<article class="card">');
          const afterGrid   = gridContent.slice(lastCardIdx);
          const lastCardEnd = afterGrid.indexOf('</article>') + '</article>'.length;
          const lastCardHtml = afterGrid.slice(0, lastCardEnd);

          // 從 idx 中移除此卡
          idx = idx.replace('\n      ' + lastCardHtml, '');

          // 插入 slug 到 SLUGS 第一位
          idx = idx.replace('var SLUGS = [', `var SLUGS = [\n    '${lastSlug}',`);
          console.log(`🔄  卡片數超過 9，已將「${lastSlug}」降入 SLUGS`);
        }
      }

      fs.writeFileSync(INDEX, idx, 'utf8');
      console.log(`✅  index.html 已更新，新文章置頂`);
    }
  }
}

// ── 6. 更新草稿 frontmatter status ────────────────────────
const updatedDraft = content
  .replace(/(\bstatus\s*:\s*)(draft|review|ready)/, '$1published')
  .replace(/(\bstatus\s*:\s*)(?!published)(\w+)/, '$1published');
fs.writeFileSync(draftPath, updatedDraft, 'utf8');
console.log(`✅  草稿 status 更新為 published`);

// ── 7. 建議的 git commit ───────────────────────────────────
console.log(`\n🚀  建議執行：`);
console.log(`    git add -f dist/articles/${slug}.html dist/index.html 08_文章_Articles_HTML/${slug}.html`);
console.log(`    git commit -m "feat(article): 發布《${title.substring(0,30)}》"`);
console.log(`    git push origin main`);
console.log(`\n📌  文章上線後網址：https://bnotescoffee.com/articles/${slug}.html\n`);
