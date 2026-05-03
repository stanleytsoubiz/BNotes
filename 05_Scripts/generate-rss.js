#!/usr/bin/env node
/**
 * BNotes generate-rss.js — RSS 2.0 feed 生成器
 *
 * 讀取 dist/articles/ 所有文章，生成 dist/feed.xml
 * publish.js 每次發布後自動呼叫此腳本
 *
 * 用法：node 05_Scripts/generate-rss.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const DIST_ART  = path.join(ROOT, 'dist', 'articles');
const FEED_PATH = path.join(ROOT, 'dist', 'feed.xml');
const BASE_URL  = 'https://bnotescoffee.com';
const MAX_ITEMS = 20;

// ── HTML 解析工具 ─────────────────────────────────────────────────────────────

function metaContent(html, name) {
  const m = html.match(new RegExp(`(?:name|property)="${name}"[^>]*content="([^"]*)"`) )
         || html.match(new RegExp(`content="([^"]*)"[^>]*(?:name|property)="${name}"`));
  return m ? m[1] : '';
}

function extractTitle(html) {
  return metaContent(html, 'og:title')
      || metaContent(html, 'title')
      || (html.match(/<title>([^<|]+)/) || [])[1]?.trim()
      || 'Untitled';
}

function extractDate(html) {
  // 優先：JSON-LD datePublished
  const jsonLd = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  if (jsonLd) return jsonLd[1];
  // 次選：og article:published_time
  const og = metaContent(html, 'article:published_time');
  if (og) return og.substring(0, 10);
  // 備援：從 frontmatter comment
  const fm = html.match(/date\s*:\s*(\d{4}-\d{2}-\d{2})/);
  if (fm) return fm[1];
  return new Date().toISOString().substring(0, 10);
}

function extractDesc(html) {
  return metaContent(html, 'description')
      || metaContent(html, 'og:description')
      || '';
}

function xmlEscape(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// RFC 822 format for RSS pubDate
function toRfc822(dateStr) {
  const d = new Date(dateStr + 'T08:00:00+08:00');
  return d.toUTCString();
}

// ── 主程式 ────────────────────────────────────────────────────────────────────

const files = fs.readdirSync(DIST_ART)
  .filter(f => f.endsWith('.html') && f !== 'index.html');

const articles = [];

for (const file of files) {
  const slug = file.replace('.html', '');
  const html = fs.readFileSync(path.join(DIST_ART, file), 'utf8');

  articles.push({
    slug,
    title: extractTitle(html),
    date:  extractDate(html),
    desc:  extractDesc(html),
    img:   `${BASE_URL}/images/ai/${slug}-hero.jpg`,
  });
}

// 依發布日期降序，取最新 MAX_ITEMS 篇
articles.sort((a, b) => b.date.localeCompare(a.date));
const recent = articles.slice(0, MAX_ITEMS);

const buildDate = new Date().toUTCString();

const itemsXml = recent.map(a => `
  <item>
    <title>${xmlEscape(a.title)}</title>
    <link>${BASE_URL}/articles/${a.slug}.html</link>
    <guid isPermaLink="true">${BASE_URL}/articles/${a.slug}.html</guid>
    <pubDate>${toRfc822(a.date)}</pubDate>
    <description>${xmlEscape(a.desc)}</description>
    <enclosure url="${xmlEscape(a.img)}" type="image/jpeg" length="0"/>
  </item>`).join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>BNotes 焙學·原豆誌</title>
    <link>${BASE_URL}</link>
    <description>讓喜好咖啡的人免費享受與世界沒有落差的專業咖啡知識庫</description>
    <language>zh-TW</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <ttl>1440</ttl>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/images/og-default.jpg</url>
      <title>BNotes 焙學·原豆誌</title>
      <link>${BASE_URL}</link>
    </image>
${itemsXml}
  </channel>
</rss>`;

fs.writeFileSync(FEED_PATH, rss, 'utf8');
console.log(`✅  RSS feed 已更新 — ${recent.length} 篇文章 → dist/feed.xml`);
console.log(`    最新：${recent[0]?.title?.substring(0, 50)} (${recent[0]?.date})`);
