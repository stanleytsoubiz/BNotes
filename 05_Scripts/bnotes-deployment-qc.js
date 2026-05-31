#!/usr/bin/env node
/**
 * BNotes deployment QC
 *
 * Separates hard deployment blockers from article-refinement backlog.
 * P0 must be zero before deployment is considered healthy.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ARTICLES = path.join(DIST, 'articles');
const REPORT = path.join(__dirname, 'BNotes_SEO_DEPLOYMENT_QC.md');
function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TODAY = process.env.BNOTES_QC_TODAY || localDateString();
const GA4_ID = 'G-2WXMBSHDSB';
const BASE = 'https://bnotescoffee.com';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function listArticles() {
  return fs.readdirSync(ARTICLES)
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .sort();
}

function meta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i');
  return (html.match(re1) || html.match(re2) || [])[1] || '';
}

function canonical(html, file) {
  return (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) || [])[1]
    || `${BASE}/articles/${file}`;
}

function datePublished(html) {
  return (html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/) || [])[1]
    || meta(html, 'article:published_time').slice(0, 10)
    || (html.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})/m) || [])[1]
    || '';
}

function visibleTitle(html) {
  return (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
}

function staticHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function h1Titles(html) {
  return [...staticHtml(html).matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map(match => match[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}

function hasHiddenHeroH1(html) {
  return /<[^>]+class=["'][^"']*article-hero[^"']*["'][^>]*style=["'][^"']*display\s*:\s*none[\s\S]*?<h1/i.test(staticHtml(html));
}

function referencesBlock(html) {
  return (html.match(/<div class=["']references["'][\s\S]*?<\/div>/i) || [])[0] || '';
}

function hasArticleSchema(html) {
  return /"@type"\s*:\s*"Article"/.test(html)
    || /"@type"\s*:\s*"BlogPosting"/.test(html)
    || /"@type"\s*:\s*"NewsArticle"/.test(html);
}

function pushIssue(list, slug, reason) {
  list.push({ slug, reason });
}

const sitemap = fs.existsSync(path.join(DIST, 'sitemap.xml')) ? read(path.join(DIST, 'sitemap.xml')) : '';
const feed = fs.existsSync(path.join(DIST, 'feed.xml')) ? read(path.join(DIST, 'feed.xml')) : '';

const p0 = [];
const p1 = [];
const p2 = [];
const published = [];
const future = [];

for (const file of listArticles()) {
  const slug = file.replace('.html', '');
  const html = read(path.join(ARTICLES, file));
  const date = datePublished(html);
  const url = canonical(html, file);
  const isFuture = date && date > TODAY;
  const titles = h1Titles(html);
  const refs = referencesBlock(html);
  if (isFuture) future.push(slug);
  else published.push(slug);

  if (/^\s*---/.test(html)) pushIssue(p0, slug, '公開 HTML 殘留 YAML frontmatter');
  if (!/<!DOCTYPE html>/i.test(html)) pushIssue(p0, slug, '缺少 HTML doctype');
  if (!/<html[^>]+lang=["']zh-TW["']/i.test(html)) pushIssue(p0, slug, '缺少 zh-TW html lang');
  if (!visibleTitle(html)) pushIssue(p0, slug, '缺少可見文章主標 h1');
  if (!meta(html, 'description')) pushIssue(p0, slug, '缺少 meta description');
  if (!canonical(html, file).startsWith(BASE)) pushIssue(p0, slug, 'canonical 不屬於 BNotes 網域');
  if (!isFuture && !sitemap.includes(url)) pushIssue(p0, slug, '已發布文章未進 sitemap');
  if (isFuture && sitemap.includes(url)) pushIssue(p0, slug, '未來稿誤進 sitemap');
  if (isFuture && feed.includes(slug)) pushIssue(p0, slug, '未來稿誤進 RSS');
  if (!html.includes(GA4_ID)) pushIssue(p0, slug, '缺少 GA4 基礎追蹤');
  if (/article-tags|<span class=["']tag|class=["']tag["']/i.test(html)) pushIssue(p0, slug, '存在可見標籤殘留風險');
  if (/<a[^>]+href=["'][^"']*(?:shopee|amazon|ruten|momo|pchome|utm_campaign=affiliate|aff_id=)/i.test(html)
    || /聯盟連結|推薦商品|購買連結/i.test(html)) {
    pushIssue(p0, slug, '商業/聯盟連結風險');
  }

  if (!meta(html, 'og:title') || !meta(html, 'og:description') || !meta(html, 'og:image')) pushIssue(p1, slug, 'OG 分享資料不完整');
  if (!meta(html, 'twitter:card') || !meta(html, 'twitter:title')) pushIssue(p1, slug, 'Twitter/X 分享資料不完整');
  if (!hasArticleSchema(html)) pushIssue(p1, slug, '缺少 Article/BlogPosting 結構化資料');
  if (!html.includes('BreadcrumbList')) pushIssue(p1, slug, '缺少 BreadcrumbList');
  if (!html.includes('article_read_complete')) pushIssue(p1, slug, '缺少閱讀完成事件');
  if (!/分享這篇|share-section/.test(html)) pushIssue(p1, slug, '缺少分享區');
  if (!/延伸閱讀|related-articles|related-posts/.test(html)) pushIssue(p1, slug, '缺少延伸閱讀');
  if (titles.length !== 1) pushIssue(p1, slug, `可見主標 h1 數量異常：${titles.length}`);
  if (hasHiddenHeroH1(html)) pushIssue(p1, slug, '主標不可只存在於隱藏 hero，需有標準可見文章標題');
  if (refs && /<ul[\s>]/i.test(refs)) pushIssue(p1, slug, '參考資料列表需使用 ol，避免與標準文章不一致');

  const guideMatch = html.match(/<div[^>]+class=["'][^"']*(?:module-conclusion|module-guide|guide-card)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const guideHtml = guideMatch ? guideMatch[0] : '';
  const guideTitle = (guideHtml.match(/<strong[^>]*class=["'][^"']*article-module-title[^"']*["'][^>]*>([\s\S]*?)<\/strong>/i) || [,''])[1].replace(/<[^>]+>/g, '').trim();
  const guideParagraph = (guideHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [,''])[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const guideItems = (guideHtml.match(/<li[\s>]/gi) || []).length;
  if (!guideHtml || guideTitle.length < 12 || guideParagraph.length < 28 || guideItems !== 3) {
    pushIssue(p2, slug, '導讀卡需讓讀者快速理解全文主旨，並提供剛好 3 個閱讀線索');
  }
  if (/先講結論/.test(guideTitle)) pushIssue(p2, slug, '導讀卡不建議直接露出「先講結論」模板字樣');
  if (!/參考資料|參考文獻|references/.test(html)) pushIssue(p2, slug, '參考資料區尚未完全標準化');
  if (!/<details[\s>]/i.test(html)) pushIssue(p2, slug, 'FAQ 尚未使用折疊式呈現');
  if (/"@type"\s*:\s*"NewsArticle"/.test(html)) pushIssue(p2, slug, '長青文章仍使用 NewsArticle，建議改 Article 或 BlogPosting');
}

const homepage = read(path.join(DIST, 'index.html'));
if (!homepage.includes('"@type": "WebSite"')) pushIssue(p0, 'homepage', '首頁缺 WebSite schema');
if (!homepage.includes('"@type": "Organization"')) pushIssue(p0, 'homepage', '首頁缺 Organization schema');
if (!homepage.includes('SearchAction')) pushIssue(p1, 'homepage', '首頁缺 SearchAction');
if (!sitemap.includes('<urlset')) pushIssue(p0, 'sitemap', 'sitemap.xml 格式異常');
if (!feed.includes('<rss')) pushIssue(p1, 'feed', 'feed.xml 格式異常');

function section(title, issues) {
  if (!issues.length) return `## ${title}\n\n- 通過\n`;
  return `## ${title}\n\n${issues.map(item => `- ${item.slug}: ${item.reason}`).join('\n')}\n`;
}

const report = `# BNotes SEO / Deployment QC

掃描日期：${new Date().toISOString()}
檢查基準日：${TODAY}

## 摘要

- 文章總數：${published.length + future.length}
- 已發布文章：${published.length}
- 未來稿：${future.length}
- P0 部署阻擋：${p0.length}
- P1 應優先修正：${p1.length}
- P2 內容成熟度項目：${p2.length}

${section('P0 部署阻擋', p0)}
${section('P1 應優先修正', p1)}
${section('P2 內容成熟度項目', p2)}
`;

fs.writeFileSync(REPORT, report, 'utf8');
console.log(JSON.stringify({
  total: published.length + future.length,
  published: published.length,
  future: future.length,
  p0: p0.length,
  p1: p1.length,
  p2: p2.length,
  report: path.relative(ROOT, REPORT),
}, null, 2));

if (p0.length) process.exitCode = 1;
