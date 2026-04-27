#!/usr/bin/env node
/**
 * scripts/sync-index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 掃描 dist/articles/ 目前存在的 HTML 檔案，
 * 移除 dist/index.html、dist/feed.xml、dist/sitemap.xml 中
 * 已不存在文章（slug）的所有引用。
 *
 * 用法：node scripts/sync-index.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const ARTICLES = path.join(ROOT, 'dist', 'articles');
const INDEX    = path.join(ROOT, 'dist', 'index.html');
const FEED     = path.join(ROOT, 'dist', 'feed.xml');
const SITEMAP  = path.join(ROOT, 'dist', 'sitemap.xml');

// ── 1. 讀取目前存在的文章 slug ─────────────────────────────────────────────
const existingSlugs = new Set(
  fs.readdirSync(ARTICLES)
    .filter(f => f.endsWith('.html'))
    .map(f => f.replace('.html', ''))
);

console.log(`✅ 目前 dist/articles/ 中有 ${existingSlugs.size} 篇文章`);

// ── 2. 從 index.html 移除不存在文章的 <article class="card"> 區塊 ──────────
function syncIndex(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  找不到 ${filePath}，跳過`);
    return false;
  }

  let html     = fs.readFileSync(filePath, 'utf-8');
  let removed  = 0;
  let modified = false;

  // 找出 index.html 中所有 /articles/{slug}.html 引用
  const slugsInIndex = new Set(
    [...html.matchAll(/\/articles\/([a-zA-Z0-9_-]+)\.html/g)]
      .map(m => m[1])
  );

  for (const slug of slugsInIndex) {
    if (!existingSlugs.has(slug)) {
      // 移除整個含此 slug 的 <article class="card">...</article> 區塊
      const before = html;
      html = html.replace(
        new RegExp(
          `\\s*<article\\s[^>]*class="[^"]*card[^"]*"[^>]*>[\\s\\S]*?/articles/${slug}\\.html[\\s\\S]*?</article>`,
          'g'
        ),
        ''
      );
      if (html !== before) {
        console.log(`  📋 index.html：移除卡片 [${slug}]`);
        removed++;
        modified = true;
      }

      // 也清理 Footer 連結
      const before2 = html;
      html = html.replace(
        new RegExp(`\\s*<a[^>]*href="/articles/${slug}\\.html"[^>]*>[^<]*</a>`, 'g'),
        ''
      );
      if (html !== before2) {
        console.log(`  🔗 index.html：移除 footer 連結 [${slug}]`);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`✅ index.html 已更新（移除 ${removed} 個卡片區塊）`);
  } else {
    console.log(`✅ index.html 無需更新`);
  }
  return modified;
}

// ── 3. 從 feed.xml 移除不存在文章的 <item> 區塊 ──────────────────────────
function syncFeed(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  找不到 ${filePath}，跳過`);
    return false;
  }

  let xml      = fs.readFileSync(filePath, 'utf-8');
  let removed  = 0;
  let modified = false;

  const slugsInFeed = new Set(
    [...xml.matchAll(/\/articles\/([a-zA-Z0-9_-]+)\.html/g)]
      .map(m => m[1])
  );

  for (const slug of slugsInFeed) {
    if (!existingSlugs.has(slug)) {
      const before = xml;
      xml = xml.replace(
        new RegExp(
          `\\s*<item>[\\s\\S]*?/articles/${slug}\\.html[\\s\\S]*?</item>`,
          'g'
        ),
        ''
      );
      if (xml !== before) {
        console.log(`  📡 feed.xml：移除 <item> [${slug}]`);
        removed++;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, xml, 'utf-8');
    console.log(`✅ feed.xml 已更新（移除 ${removed} 個 item）`);
  } else {
    console.log(`✅ feed.xml 無需更新`);
  }
  return modified;
}

// ── 4. 從 sitemap.xml 移除不存在文章的 <url> 區塊 ────────────────────────
function syncSitemap(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  找不到 ${filePath}，跳過`);
    return false;
  }

  let xml      = fs.readFileSync(filePath, 'utf-8');
  let removed  = 0;
  let modified = false;

  const slugsInSitemap = new Set(
    [...xml.matchAll(/\/articles\/([a-zA-Z0-9_-]+)\.html/g)]
      .map(m => m[1])
  );

  for (const slug of slugsInSitemap) {
    if (!existingSlugs.has(slug)) {
      const before = xml;
      xml = xml.replace(
        new RegExp(
          `\\s*<url>[\\s\\S]*?/articles/${slug}\\.html[\\s\\S]*?</url>`,
          'g'
        ),
        ''
      );
      if (xml !== before) {
        console.log(`  🗺️  sitemap.xml：移除 <url> [${slug}]`);
        removed++;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, xml, 'utf-8');
    console.log(`✅ sitemap.xml 已更新（移除 ${removed} 個 url）`);
  } else {
    console.log(`✅ sitemap.xml 無需更新`);
  }
  return modified;
}

// ── 執行 ──────────────────────────────────────────────────────────────────
console.log('\n🔄 同步中...\n');
const r1 = syncIndex(INDEX);
const r2 = syncFeed(FEED);
const r3 = syncSitemap(SITEMAP);

const anyChanged = r1 || r2 || r3;
console.log('\n' + (anyChanged ? '✅ 同步完成，有檔案已更新' : '✅ 所有引用均一致，無需更新'));

// 設定 GitHub Actions output（供後續 step 判斷是否需要 commit）
if (process.env.GITHUB_OUTPUT) {
  const output = `changed=${anyChanged ? 'true' : 'false'}\n`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log(`📤 GITHUB_OUTPUT: ${output.trim()}`);
}
