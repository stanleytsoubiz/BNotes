#!/usr/bin/env node
/**
 * Fix P0 brand-shell issues found by bnotes-brand-shell-audit.
 *
 * Scope is intentionally narrow:
 * - source and dist article HTML only
 * - standard nav logo CSS/markup
 * - visible H1 marker consistency
 * - bnotes-v3 style marker
 * - short meta descriptions that have a longer OG/Twitter equivalent
 * - affiliate disclosure injector text, which is disallowed before authority goals
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = [
  path.join(ROOT, '08_文章_Articles_HTML'),
  path.join(ROOT, 'dist', 'articles'),
];

const STANDARD_LOGO_CSS = [
  ".nav-logo{font-family:var(--font-serif,'Noto Serif TC',Georgia,serif);font-size:1.15rem;font-weight:900;color:var(--coffee-dark,#1a0a00);letter-spacing:.02em;text-decoration:none}",
  ".nav-logo b{color:var(--gold,#c8922a)}",
  ".nav-sub{font-family:var(--font-sans,'Noto Sans TC',-apple-system,sans-serif);font-size:.65rem;color:oklch(50% .02 30);letter-spacing:.12em;text-transform:uppercase;display:block;margin-top:.1rem}",
].join('');

function listHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .map(file => path.join(dir, file));
}

function longerMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function replaceMetaDescription(html) {
  const current = longerMeta(html, 'description');
  const candidates = [
    longerMeta(html, 'og:description'),
    longerMeta(html, 'twitter:description'),
  ].filter(Boolean).sort((a, b) => b.length - a.length);
  const best = candidates[0] || '';
  if (!current || (current.includes('…') && best.length > current.length) || current.length < 40) {
    if (best.length >= 40) {
      return html.replace(/<meta[^>]+name=["']description["'][^>]*>/i, `<meta name="description" content="${best}">`);
    }
  }
  return html;
}

function removeAffiliateInjector(html) {
  return html
    .replace(/\s*\/\*\s*──\s*4\.\s*聯盟行銷利益揭露自動注入\s*──\s*\*\/\s*\(function injectAffiliateDisclosure\(\)\s*\{[\s\S]*?\}\)\(\);\s*/g, '\n')
    .replace(/\s*\/\*\s*bnotes-affiliate-disclosure[\s\S]*?\/\*\s*\/bnotes-affiliate-disclosure\s*\*\/\s*/g, '\n')
    .replace(/\n?[*_]?利益揭露[:：][^\n]*(?:聯盟連結|聯盟營銷|小額回饋)[^\n]*[*_]?\n?/g, '\n');
}

function normalizeLogo(html) {
  let next = html;
  if (/\.nav-logo\s*\{[^}]*\}/.test(next)) {
    next = next.replace(/\.nav-logo\s*\{[^}]*\}/g, STANDARD_LOGO_CSS.match(/\.nav-logo\{[^}]+\}/)[0]);
  } else {
    next = next.replace(/(<style[^>]*>)/i, `$1\n${STANDARD_LOGO_CSS.match(/\.nav-logo\{[^}]+\}/)[0]}\n`);
  }
  next = next.replace(/\.nav-logo\s+b\s*\{[^}]*\}/g, STANDARD_LOGO_CSS.match(/\.nav-logo b\{[^}]+\}/)[0]);
  if (!/\.nav-logo\s+b\s*\{[^}]*\}/.test(next)) {
    next = next.replace(/(<style[^>]*>)/i, `$1\n${STANDARD_LOGO_CSS.match(/\.nav-logo b\{[^}]+\}/)[0]}\n`);
  }
  if (/\.nav-sub\s*\{[^}]*\}/.test(next)) {
    next = next.replace(/\.nav-sub\s*\{[^}]*\}/g, STANDARD_LOGO_CSS.match(/\.nav-sub\{[^}]+\}/)[0]);
  } else {
    next = next.replace(/(<style[^>]*>)/i, `$1\n${STANDARD_LOGO_CSS.match(/\.nav-sub\{[^}]+\}/)[0]}\n`);
  }
  next = next.replace(
    /<span\s+style=["'][^"']*letter-spacing:[^"']*焙學·原豆誌<\/span>/gi,
    '<span class="nav-sub">焙學·原豆誌</span>'
  );
  return next;
}

function markBnotesStyle(html) {
  if (html.includes('id="bnotes-v3"')) return html;
  return html.replace(/<style(\s*>|\s[^>]*>)/i, '<style id="bnotes-v3"$1');
}

function normalizeVisibleTitle(html) {
  let next = html;
  next = next.replace(/<div([^>]*class=["'][^"']*article-h1[^"']*["'][^>]*)role=["']heading["'][^>]*aria-level=["']1["']([^>]*)>([\s\S]*?)<\/div>/gi, '<h1$1$2>$3</h1>');
  next = next.replace(/<div([^>]*role=["']heading["'][^>]*aria-level=["']1["'][^>]*class=["'][^"']*article-h1[^"']*["'][^>]*)>([\s\S]*?)<\/div>/gi, '<h1$1>$2</h1>');
  const h1Count = (next.replace(/<script[\s\S]*?<\/script>/gi, '').match(/<h1\b/gi) || []).length;
  if (h1Count > 1) {
    next = next.replace(/<h1([^>]*class=["'][^"']*article-h1[^"']*["'][^>]*)>([\s\S]*?)<\/h1>/i, '<div$1 role="heading" aria-level="1">$2</div>');
  }
  if ((next.replace(/<script[\s\S]*?<\/script>/gi, '').match(/<h1\b/gi) || []).length === 0) {
    next = next.replace(/<div([^>]*class=["'][^"']*article-h1[^"']*["'][^>]*)role=["']heading["'][^>]*aria-level=["']1["']([^>]*)>([\s\S]*?)<\/div>/i, '<h1$1$2>$3</h1>');
  }
  next = next.replace(/<h1\s+style=["']display\s*:\s*none["']([^>]*)>/i, '<h1 class="bnotes-title" style="display:none"$1>');
  next = next.replace(/<div class=["']article-header["']>\s*<h1(?![^>]*class=)([^>]*)>/i, '<div class="article-header"><h1 class="bnotes-title"$1>');
  next = next.replace(/<article class=["']article-body["']>\s*<h1(?![^>]*class=)([^>]*)>/i, '<article class="article-body">\n<h1 class="bnotes-title"$1>');
  next = next.replace(/headerHtml\+='<!-- removed duplicate template H1 -->';/g, "headerHtml+='<h1 class=\"bnotes-title\">'+title+'</h1>';");
  return next;
}

function processFile(file) {
  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  html = replaceMetaDescription(html);
  html = removeAffiliateInjector(html);
  html = normalizeLogo(html);
  html = markBnotesStyle(html);
  html = normalizeVisibleTitle(html);

  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    return true;
  }
  return false;
}

const changed = [];
for (const dir of DIRS) {
  for (const file of listHtmlFiles(dir)) {
    if (processFile(file)) changed.push(path.relative(ROOT, file));
  }
}

console.log(JSON.stringify({
  changedCount: changed.length,
  changed,
}, null, 2));
