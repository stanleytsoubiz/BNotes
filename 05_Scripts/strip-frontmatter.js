#!/usr/bin/env node
/**
 * scripts/strip-frontmatter.js  v2
 * 靜態剝除 dist/articles/ 與 dist/_scheduled/ 所有 HTML 開頭的 YAML frontmatter
 * 同時更新 dist/index.html 的精選文章 grid 與 SEARCH_DATA
 * 在 deploy pipeline 執行（deploy.yml Step: Strip YAML frontmatter）
 */
const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const DIST    = path.join(ROOT, 'dist');
const FM_RE   = /^---[\r\n][\s\S]*?[\r\n]---[\r\n]*/;

// ── helper: parse frontmatter ────────────────────────────────────────────────
function parseFM(raw) {
  const m = raw.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w[\w_-]*):\s*(.+)/);
    if (mm) fm[mm[1].trim()] = mm[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

// ── Step 1: strip frontmatter from dist/articles/ ───────────────────────────
let count = 0;
const articlesMeta = [];  // for index rebuild
const articlesDir = path.join(DIST, 'articles');

for (const fname of fs.readdirSync(articlesDir)) {
  if (!fname.endsWith('.html')) continue;
  const fpath = path.join(articlesDir, fname);
  let content = fs.readFileSync(fpath, 'utf-8');
  const fm = parseFM(content);
  const cleaned = content.replace(FM_RE, '');
  if (cleaned !== content) {
    fs.writeFileSync(fpath, cleaned, 'utf-8');
    count++;
  }
  const slug = fname.replace('.html', '');
  articlesMeta.push({
    slug, title: fm.title || slug, date: fm.date || '',
    category: fm.category || 'lifestyle', description: fm.description || '',
    cover_image: fm.cover_image || '', reading_time: fm.reading_time || '',
  });
}
console.log(`✅ strip-frontmatter [articles]: stripped ${count} files`);

// ── Step 2: strip frontmatter from dist/_scheduled/ ─────────────────────────
let countSched = 0;
const scheduledDir = path.join(DIST, '_scheduled');
if (fs.existsSync(scheduledDir)) {
  for (const fname of fs.readdirSync(scheduledDir)) {
    if (!fname.endsWith('.html')) continue;
    const fpath = path.join(scheduledDir, fname);
    let content = fs.readFileSync(fpath, 'utf-8');
    const cleaned = content.replace(FM_RE, '');
    if (cleaned !== content) {
      fs.writeFileSync(fpath, cleaned, 'utf-8');
      countSched++;
    }
  }
}
console.log(`✅ strip-frontmatter [_scheduled]: stripped ${countSched} files`);

// ── Step 3: rebuild dist/index.html featured grid + SEARCH_DATA ─────────────
const CAT_LABELS = {
  'pour-over':'手沖技法','espresso':'義式咖啡','equipment':'器材評測',
  'terroir':'產地風土','science':'冲泡科學','lifestyle':'咖啡生活',
};

function makeCard(a) {
  const cat = CAT_LABELS[a.category] || a.category;
  const desc = a.description.length > 80 ? a.description.slice(0, 80) + '…' : a.description;
  const rt   = a.reading_time ? `<span>·</span><span>${a.reading_time} 分鐘</span>` : '';
  const img  = a.cover_image
    ? `<img class="card-img" src="${a.cover_image}" alt="${a.title}" loading="lazy" decoding="async">`
    : '<div class="card-img-placeholder"></div>';
  return `<article class="card">
  <a href="/articles/${a.slug}.html" aria-label="${a.title}">
    <div class="card-img-wrap">
      ${img}
      <span class="card-cat">${cat}</span>
    </div>
    <div class="card-body">
      <div class="card-meta"><span>${a.date.slice(0,10)}</span>${rt}</div>
      <h3 class="card-title">${a.title}</h3>
      <p class="card-desc">${desc}</p>
    </div>
  </a>
</article>`;
}

// Sort by date desc, take latest 6 for grid
articlesMeta.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const featured = articlesMeta.slice(0, 6);
const gridHTML = featured.map(makeCard).join('\n');

// Build SEARCH_DATA
const escJS = s => s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,'\\n');
const searchEntries = articlesMeta.map(a => {
  const cat = CAT_LABELS[a.category] || a.category;
  return `{'slug':'${a.slug}','title':'${escJS(a.title)}','cat':'${cat}','desc':'${escJS((a.description||'').slice(0,120))}'}`;
});
const searchDataJS = `const SEARCH_DATA = [${searchEntries.join(',')}];`;

const idxPath = path.join(DIST, 'index.html');
let idx = fs.readFileSync(idxPath, 'utf-8');

// Replace grid (with id="latest-grid" for load-more JS to work)
idx = idx.replace(/<div class="grid"[^>]*>[\s\S]*?<\/div>\s*(<\/div>\s*<\/section>\s*<div class="divider">)/,
  `<div class="grid" id="latest-grid">\n${gridHTML}\n    </div>\n    $1`);

// Replace SEARCH_DATA line
idx = idx.replace(/const SEARCH_DATA = \[[\s\S]*?\];/, searchDataJS);

fs.writeFileSync(idxPath, idx, 'utf-8');
console.log(`✅ index.html: injected ${featured.length} featured cards, ${articlesMeta.length} search entries`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `stripped=${count + countSched}\n`);
}
