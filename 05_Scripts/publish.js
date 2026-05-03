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
  //     注意：實際 HTML 第一張卡片帶有 data-cat 等屬性（<article class="card" data-cat="...">），
  //     因此用 regex /<article class="card"[\s>]/ 匹配，避免精準字串失配。
  const CARD_OPEN_RE = /<article class="card"[\s>]/g;
  const gridStart = idx.indexOf('id="latest-grid"');
  if (gridStart === -1) {
    console.warn('⚠️   找不到 #latest-grid，請手動更新 index.html');
  } else {
    // 在 gridStart 之後尋找第一張卡片
    CARD_OPEN_RE.lastIndex = gridStart;
    const firstMatch = CARD_OPEN_RE.exec(idx);
    const firstCard = firstMatch ? firstMatch.index : -1;
    if (firstCard === -1) {
      console.warn('⚠️   找不到第一張卡片，請手動更新 index.html');
    } else {
      idx = idx.slice(0, firstCard) + card + '\n      ' + idx.slice(firstCard);
      // 註：firstCard 之前已有縮排空白，因此只在新卡片後補一次換行+縮排

      // 5d. 計算 hardcoded 卡片數，若超過 9 張，把最後一張降入 SLUGS
      const gridEnd = idx.indexOf('</div>\n    <div id="load-more-wrap"');
      const gridContent = idx.slice(gridStart, gridEnd);
      const gridCards = [...gridContent.matchAll(/<article class="card"[\s>]/g)];

      if (gridCards.length > 9) {
        // 找最後一張卡，取其 slug，移入 SLUGS
        const lastCardMatches = [...gridContent.matchAll(/href="\/articles\/([^"]+)\.html"/g)];
        const lastSlug = lastCardMatches[lastCardMatches.length - 1]?.[1];

        if (lastSlug) {
          // 找最後一張完整 card HTML 並刪除（用 regex 找最後一個開始位置）
          const lastCardOpenIdx = gridCards[gridCards.length - 1].index;
          const afterGrid   = gridContent.slice(lastCardOpenIdx);
          const lastCardEnd = afterGrid.indexOf('</article>') + '</article>'.length;
          const lastCardHtml = afterGrid.slice(0, lastCardEnd);

          // 從 idx 中移除此卡（連同前面的縮排換行）
          if (idx.includes('\n      ' + lastCardHtml)) {
            idx = idx.replace('\n      ' + lastCardHtml, '');
          } else {
            idx = idx.replace(lastCardHtml, '');
          }

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

// ── 7. 更新 sitemap.xml ────────────────────────────────────
const sitemapPath = path.join(ROOT, 'dist', 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');
  if (!sitemap.includes(`/articles/${slug}`)) {
    const newEntry = `  <url>\n    <loc>https://bnotescoffee.com/articles/${slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    sitemap = sitemap.replace('</urlset>', newEntry + '</urlset>');
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    console.log(`✅  sitemap.xml 已加入 ${slug}`);
  } else {
    console.log(`ℹ️   sitemap.xml 已含此 slug，跳過`);
  }
}

// ── 8. IndexNow ping ──────────────────────────────────────
const { execSync } = require('child_process');
const INDEXNOW_KEY = '4c5bbd8accc0d62f986790f5eb4818e5';
try {
  const body = JSON.stringify({
    host: 'bnotescoffee.com',
    key: INDEXNOW_KEY,
    keyLocation: `https://bnotescoffee.com/${INDEXNOW_KEY}.txt`,
    urlList: [`https://bnotescoffee.com/articles/${slug}.html`]
  });
  execSync(`curl -s -o /dev/null -w "%{http_code}" -X POST "https://api.indexnow.org/IndexNow" -H "Content-Type: application/json" -d '${body}'`);
  console.log(`✅  IndexNow ping 送出 → https://bnotescoffee.com/articles/${slug}.html`);
} catch(e) {
  console.warn(`⚠️   IndexNow ping 失敗（可於 git push 後手動補送）`);
}

// ── 9. 更新 RSS feed ──────────────────────────────────────
try {
  const rssScript = path.join(__dirname, 'generate-rss.js');
  if (fs.existsSync(rssScript)) {
    execSync(`node "${rssScript}"`, { stdio: 'pipe' });
    console.log(`✅  RSS feed 已更新 → dist/feed.xml`);
  }
} catch(e) {
  console.warn(`⚠️   RSS feed 更新失敗（不影響發布）：${e.message}`);
}

// ── 10. 建議的 git commit ──────────────────────────────────
console.log(`\n🚀  建議執行：`);
console.log(`    git add -f dist/articles/${slug}.html dist/index.html dist/sitemap.xml dist/feed.xml 08_文章_Articles_HTML/${slug}.html`);
console.log(`    git commit -m "feat(article): 發布《${title.substring(0,30)}》"`);
console.log(`    git push origin main`);
console.log(`\n📌  文章上線後網址：https://bnotescoffee.com/articles/${slug}.html\n`);
