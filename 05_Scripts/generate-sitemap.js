#!/usr/bin/env node
/**
 * BNotes generate-sitemap.js
 *
 * Rebuilds dist/sitemap.xml from the current deployed dist/ tree.
 * Rules:
 * - Include indexable root pages, category pages, and article pages.
 * - Prefer each page canonical URL when present.
 * - Exclude noindex pages, article index pages, admin/API paths, and future-dated articles.
 * - Keep URLs unique and deterministic.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'sitemap.xml');
const BASE_URL = 'https://bnotescoffee.com';
function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TODAY = process.env.SITEMAP_TODAY || localDateString();

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['admin', 'api', '_scheduled'].includes(entry.name)) continue;
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i');
  return (html.match(re1) || html.match(re2) || [])[1] || '';
}

function canonicalUrl(html, file) {
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) || [])[1];
  if (canonical) return canonical;

  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  if (rel === 'index.html') return `${BASE_URL}/`;
  return `${BASE_URL}/${rel}`;
}

function extractPublishedDate(html) {
  const candidates = [
    (html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/) || [])[1],
    metaContent(html, 'article:published_time').slice(0, 10),
    (html.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})/m) || [])[1],
  ].filter(Boolean);
  return candidates[0] || '';
}

function extractLastmod(html, stat) {
  const candidates = [
    (html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/) || [])[1],
    metaContent(html, 'article:modified_time').slice(0, 10),
    extractPublishedDate(html),
  ].filter(Boolean);
  return candidates[0] || stat.mtime.toISOString().slice(0, 10);
}

function priorityFor(url) {
  if (url === `${BASE_URL}/`) return '1.0';
  if (url.includes('/category/')) return '0.8';
  if (url.includes('/articles/')) return '0.8';
  if (url.includes('/about')) return '0.6';
  if (url.includes('/gear')) return '0.7';
  return '0.6';
}

function changefreqFor(url) {
  if (url === `${BASE_URL}/`) return 'weekly';
  if (url.includes('/category/')) return 'weekly';
  return 'monthly';
}

function shouldSkip(file, html, publishedDate) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  if (rel === '404.html') return true;
  if (rel === 'articles/index.html') return true;
  if (/noindex/i.test(html)) return true;
  if (rel.startsWith('articles/') && publishedDate && publishedDate > TODAY) return true;
  return false;
}

const urls = new Map();
for (const file of walk(DIST)) {
  const html = read(file);
  const stat = fs.statSync(file);
  const publishedDate = extractPublishedDate(html);
  if (shouldSkip(file, html, publishedDate)) continue;

  const url = canonicalUrl(html, file).replace(/\/index\.html$/, '/');
  if (!url.startsWith(BASE_URL)) continue;

  urls.set(url, {
    loc: url,
    lastmod: extractLastmod(html, stat),
    changefreq: changefreqFor(url),
    priority: priorityFor(url),
  });
}

const ordered = [...urls.values()].sort((a, b) => {
  if (a.loc === `${BASE_URL}/`) return -1;
  if (b.loc === `${BASE_URL}/`) return 1;
  return a.loc.localeCompare(b.loc);
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ordered.map(item => `  <url>
    <loc>${xmlEscape(item.loc)}</loc>
    <lastmod>${xmlEscape(item.lastmod)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(OUT, xml, 'utf8');
console.log(`OK sitemap rebuilt: ${ordered.length} URLs -> dist/sitemap.xml`);
console.log(`   excluded future articles after ${TODAY}`);
