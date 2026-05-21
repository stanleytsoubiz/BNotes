#!/usr/bin/env node
/**
 * BNotes brand shell audit
 *
 * Focuses on the article-reading standard the MD roundtable has been refining:
 * logo shell, visible title, typography, guide card, FAQ, references, share,
 * related articles, and the final block order.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ARTICLES = path.join(DIST, 'articles');
const SITEMAP = path.join(DIST, 'sitemap.xml');
const REPORT = path.join(__dirname, 'BNotes_BRAND_SHELL_AUDIT.md');
const BASE = 'https://bnotescoffee.com';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function textOnly(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function countMatches(html, re) {
  return [...html.matchAll(re)].length;
}

function firstIndex(html, re) {
  const match = html.match(re);
  return match ? match.index : -1;
}

function getBlock(html, re) {
  return (html.match(re) || [''])[0] || '';
}

function sitemapSlugs() {
  if (!fs.existsSync(SITEMAP)) {
    return fs.readdirSync(ARTICLES)
      .filter(file => file.endsWith('.html') && file !== 'index.html')
      .map(file => file.replace(/\.html$/, ''))
      .sort();
  }

  const slugs = new Set();
  const xml = read(SITEMAP);
  for (const match of xml.matchAll(/<loc>https:\/\/bnotescoffee\.com\/articles\/([^<]+?)<\/loc>/g)) {
    const slug = match[1].replace(/\.html$/, '').replace(/\/$/, '');
    if (slug && slug !== 'index') slugs.add(slug);
  }
  return [...slugs].sort();
}

function push(list, level, slug, area, reason) {
  list.push({ level, slug, area, reason });
}

function checkArticle(slug) {
  const file = path.join(ARTICLES, `${slug}.html`);
  const issues = [];
  if (!fs.existsSync(file)) {
    push(issues, 'P0', slug, '檔案', 'sitemap 有收錄，但 dist/articles 找不到對應 HTML');
    return issues;
  }

  const html = read(file);
  const staticHtml = stripScripts(html);
  const refs = getBlock(html, /<div[^>]+class=["'][^"']*references[^"']*["'][\s\S]*?<\/div>/i);
  const related = getBlock(html, /<div[^>]+class=["'][^"']*related-articles[^"']*["'][\s\S]*?<\/div>\s*<\/div>/i)
    || getBlock(html, /<section[^>]+class=["'][^"']*related-articles[^"']*["'][\s\S]*?<\/section>/i);
  const share = getBlock(html, /<div[^>]+class=["'][^"']*share-section[^"']*["'][\s\S]*?<\/div>/i);
  const faqCount = countMatches(html, /<details\b/gi);
  const relatedCardCount = countMatches(related, /<a[^>]+class=["'][^"']*related-card[^"']*["']/gi);
  const h1Count = countMatches(staticHtml, /<h1\b/gi);

  if (!/<html[^>]+lang=["']zh-TW["']/i.test(html)) {
    push(issues, 'P0', slug, '文章外殼', '缺少 zh-TW 語系設定');
  }
  if (!/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/bnotescoffee\.com\/articles\/[^"']+["']/i.test(html)) {
    push(issues, 'P0', slug, 'SEO 外殼', 'canonical 不完整或不屬於 BNotes 文章路徑');
  }
  if (!/<meta[^>]+(?:name|property)=["']description["'][^>]+content=["'][^"']{40,}["']/i.test(html)
    && !/<meta[^>]+content=["'][^"']{40,}["'][^>]+(?:name|property)=["']description["']/i.test(html)) {
    push(issues, 'P0', slug, 'SEO 外殼', 'meta description 缺失或過短');
  }
  if (!html.includes('id="bnotes-v3"')) {
    push(issues, 'P0', slug, '品牌外殼', '缺少 bnotes-v3 標準樣式標記');
  }
  if (!html.includes('class="nav-logo"') || !html.includes('<b>B</b>Notes') || !html.includes('nav-sub')) {
    push(issues, 'P0', slug, 'Logo', 'Logo 結構未使用 <b>B</b>Notes + nav-sub 標準');
  }
  if (!/\.nav-logo\s*\{[^}]*font-family:[^}]*var\(--(?:font-)?serif|\.nav-logo\s*\{[^}]*font-family:[^}]*var\(--serif/i.test(html)
    || !/\.nav-logo\s+b\s*\{[^}]*color:\s*var\(--gold/i.test(html)
    || !/\.nav-sub\s*\{[^}]*letter-spacing:[^}]*\.12em/i.test(html)) {
    push(issues, 'P0', slug, 'Logo', 'Logo 字體、金色 B 或副標字距未完整套用');
  }
  if (!html.includes('class="bnotes-title"') && !html.includes('class="bnotes-unified-title"') && !/<h1[^>]+class=["'][^"']*article-h1[^"']*["']/i.test(html)) {
    push(issues, 'P0', slug, '主標', '缺少標準可見主標 class');
  }
  if (h1Count !== 1) {
    push(issues, 'P1', slug, '主標', `可見/靜態 H1 數量異常：${h1Count}`);
  }

  if (!/Noto Serif TC/i.test(html) || !/Noto Sans TC/i.test(html)) {
    push(issues, 'P1', slug, '字體', '未完整引用 Noto Serif TC / Noto Sans TC');
  }
  if (!/--font-serif|--serif/.test(html) || !/--font-sans|--sans/.test(html)) {
    push(issues, 'P1', slug, '字體', '缺少品牌字體 token');
  }
  if (!/\.article-body[^}]*max-width:\s*(?:740|760|780)px|\.article-wrap[^}]*max-width:\s*(?:740|760|780)px/i.test(html)) {
    push(issues, 'P2', slug, '正文寬度', '正文寬度未明確接近 740px 閱讀標準');
  }

  if (!/module-conclusion|module-guide|guide-card|先把/.test(html)) {
    push(issues, 'P1', slug, '導讀卡', '缺少單一導讀卡或「先把...讀懂」標準');
  }
  if (!/\.module-conclusion\s+li|\.module-conclusion li/i.test(html)) {
    push(issues, 'P2', slug, '導讀卡', '導讀卡列表間距樣式未明確設定，容易重現間距過大問題');
  }
  if (faqCount < 5) {
    push(issues, 'P1', slug, '常見問題', `折疊式 FAQ 少於 5 題：目前 ${faqCount}`);
  }
  if (!/\.faq-answer\s*\{[^}]*display:\s*none/i.test(html) || !/\.faq-item(?:\.open|\[open\])\s+\.faq-answer\s*\{[^}]*display:\s*block/i.test(html)) {
    push(issues, 'P1', slug, '常見問題', 'FAQ 折疊樣式不完整，可能無法符合 OliveWisdom 式展開體驗');
  }
  if (!refs) {
    push(issues, 'P1', slug, '參考資料', '缺少 references 區塊');
  } else if (!/<ol[\s>]/i.test(refs)) {
    push(issues, 'P1', slug, '參考資料', '參考資料未使用標準有序列表 ol');
  }
  if (!/\.references\s*\{[^}]*font-size:\s*\.82rem|\.references\s*\{[^}]*font-size:\s*0\.82rem/i.test(html)) {
    push(issues, 'P2', slug, '參考資料', '參考資料字級未明確對齊 .82rem 標準');
  }

  if (!share) {
    push(issues, 'P1', slug, '分享這篇', '缺少 share-section');
  } else {
    const shareChecks = [
      ['LINE', /line\.me/i],
      ['Facebook', /facebook\.com\/sharer/i],
      ['Threads', /threads\.net/i],
      ['X', /twitter\.com\/intent\/tweet|x\.com\/intent\/tweet/i],
      ['Copy', /clipboard\.writeText|copyArticleLink/i],
    ];
    for (const [name, re] of shareChecks) {
      if (!re.test(html)) push(issues, 'P1', slug, '分享這篇', `${name} 分享功能缺失`);
    }
    for (const cls of ['share-btn', 'share-btn-line', 'share-btn-fb', 'share-btn-threads', 'share-btn-x', 'share-btn-copy']) {
      if (!html.includes(cls)) push(issues, 'P1', slug, '分享這篇', `${cls} 樣式/元素缺失`);
    }
  }

  if (!/related-articles/.test(html)) {
    push(issues, 'P1', slug, '延伸閱讀', '缺少 related-articles');
  } else {
    if (relatedCardCount !== 3) {
      push(issues, 'P1', slug, '延伸閱讀', `延伸閱讀應聚焦 3 篇，目前偵測 ${relatedCardCount} 篇`);
    }
    for (const cls of ['related-title', 'related-grid', 'related-card', 'related-card:hover', 'related-kicker', 'related-card-title']) {
      if (!html.includes(cls)) push(issues, 'P1', slug, '延伸閱讀', `${cls} 樣式/元素缺失`);
    }
  }

  const firstParagraph = firstIndex(staticHtml, /<p\b[\s\S]*?<\/p>/i);
  const guideIdx = firstIndex(staticHtml, /class=["'][^"']*(?:module-conclusion|module-guide|guide-card)[^"']*["']|先把/i);
  const firstH2 = firstIndex(staticHtml, /<h2\b/i);
  const faqIdx = firstIndex(staticHtml, /class=["'][^"']*faq-section[^"']*["']|<details\b/i);
  const refsIdx = firstIndex(staticHtml, /class=["'][^"']*references[^"']*["']/i);
  const shareIdx = firstIndex(staticHtml, /class=["'][^"']*share-section[^"']*["']/i);
  const relatedIdx = firstIndex(staticHtml, /class=["'][^"']*related-articles[^"']*["']/i);

  if (guideIdx >= 0 && firstParagraph >= 0 && guideIdx < firstParagraph) {
    push(issues, 'P2', slug, '區塊順序', '導讀卡出現在自然開場之前，閱讀節奏可能被打斷');
  }
  if (guideIdx >= 0 && firstH2 >= 0 && guideIdx > firstH2) {
    push(issues, 'P1', slug, '區塊順序', '導讀卡應放在第一個 H2 之前');
  }
  if (faqIdx >= 0 && refsIdx >= 0 && refsIdx < faqIdx) {
    push(issues, 'P1', slug, '區塊順序', '參考資料應放在 FAQ 之後');
  }
  if (refsIdx >= 0 && shareIdx >= 0 && shareIdx < refsIdx) {
    push(issues, 'P1', slug, '區塊順序', '分享這篇應放在參考資料之後');
  }
  if (shareIdx >= 0 && relatedIdx >= 0 && relatedIdx < shareIdx) {
    push(issues, 'P1', slug, '區塊順序', '延伸閱讀應放在分享這篇之後');
  }

  if (/article-tags|<strong[^>]*>標籤|標籤：<\/strong>|class=["']tag["']|<span class=["']tag/i.test(html)) {
    push(issues, 'P0', slug, '標籤', '文章內頁不得殘留可見標籤');
  }
  if (/<a[^>]+href=["'][^"']*(?:\/re\/|shopee|amazon|ruten|momo|pchome|utm_campaign=affiliate|aff_id=)/i.test(html)
    || /AFFILIATE PLACEHOLDER|聯盟連結|聯盟行銷|利益揭露|小額佣金|推薦商品|購買連結/i.test(html)) {
    push(issues, 'P0', slug, '商業連結', '權威目標達成前不得放商業/聯盟連結或佔位文字');
  }
  if (/📊|📤|✅|☕|🔥|⭐|💡|👉|🚀/.test(textOnly(staticHtml))) {
    push(issues, 'P2', slug, '符號語氣', '內文仍有不必要符號，需改為專業標題或純文字');
  }

  return issues;
}

const slugs = sitemapSlugs();
const allIssues = slugs.flatMap(checkArticle);
const p0 = allIssues.filter(item => item.level === 'P0');
const p1 = allIssues.filter(item => item.level === 'P1');
const p2 = allIssues.filter(item => item.level === 'P2');
const bySlug = new Map();
for (const issue of allIssues) {
  if (!bySlug.has(issue.slug)) bySlug.set(issue.slug, []);
  bySlug.get(issue.slug).push(issue);
}
const passCount = slugs.filter(slug => !bySlug.has(slug)).length;

function issueLines(levelIssues) {
  if (!levelIssues.length) return '- 通過\n';
  const grouped = new Map();
  for (const issue of levelIssues) {
    const key = issue.slug;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(issue);
  }
  return [...grouped.entries()].map(([slug, issues]) => {
    const reasons = issues.map(issue => `${issue.area}: ${issue.reason}`).join('；');
    return `- ${slug}: ${reasons}`;
  }).join('\n') + '\n';
}

function slugSummaryLines() {
  const entries = [...bySlug.entries()].sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2 };
    const aRank = Math.min(...a[1].map(issue => rank[issue.level]));
    const bRank = Math.min(...b[1].map(issue => rank[issue.level]));
    if (aRank !== bRank) return aRank - bRank;
    return a[0].localeCompare(b[0]);
  });
  if (!entries.length) return '- 全部通過\n';
  return entries.map(([slug, issues]) => {
    const levels = [...new Set(issues.map(issue => issue.level))].join('/');
    const areas = [...new Set(issues.map(issue => issue.area))].join('、');
    return `- ${slug}: ${levels}｜${areas}`;
  }).join('\n') + '\n';
}

const report = `# BNotes Brand Shell Audit

掃描日期：${new Date().toISOString()}
掃描來源：${BASE}/sitemap.xml 對應 dist/articles

## MD 圓桌會議判斷

本檢查專注於讀者進入文章後是否感覺「這就是 BNotes 的天地與樣貌」：Logo、主標、品牌字體、正文寬度、單一導讀卡、折疊 FAQ、參考資料、分享這篇、三篇延伸閱讀與區塊順序。

## 摘要

- sitemap 文章數：${slugs.length}
- 完全通過本次品牌版型總檢：${passCount}
- 需要修正文章：${bySlug.size}
- P0 品牌/信任阻擋：${p0.length}
- P1 版型一致性優先修正：${p1.length}
- P2 白金化精修項目：${p2.length}

## 逐篇缺口總覽

${slugSummaryLines()}
## P0 品牌/信任阻擋

${issueLines(p0)}
## P1 版型一致性優先修正

${issueLines(p1)}
## P2 白金化精修項目

${issueLines(p2)}
## 下一步建議

1. 先修 P0：主標、Logo、標籤、商業連結與 SEO 外殼，這些屬於品牌信任底線。
2. 再修 P1：FAQ、參考資料、分享區、延伸閱讀與區塊順序，這些決定讀者是否覺得每篇文章都像 BNotes。
3. 最後修 P2：導讀卡密度、正文寬度、符號語氣與參考資料字級，讓每篇文章從黃金標準推到白金標準。
`;

fs.writeFileSync(REPORT, report, 'utf8');

console.log(JSON.stringify({
  articles: slugs.length,
  pass: passCount,
  needsWork: bySlug.size,
  p0: p0.length,
  p1: p1.length,
  p2: p2.length,
  report: path.relative(ROOT, REPORT),
}, null, 2));

if (p0.length) process.exitCode = 1;
