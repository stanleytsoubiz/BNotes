#!/usr/bin/env node
/**
 * BNotes Hero Image Generator
 * ────────────────────────────────────────────────────────────────────────────
 * 為每篇文章自動選取並下載符合部落格風格的高品質 hero 圖片。
 *
 * 策略（優先順序）：
 *   1. Slug 精確映射表（curated — 品質最優）
 *   2. 分類關鍵字映射（category fallback）
 *   3. Pexels API 動態搜尋（需設定 PEXELS_API_KEY 環境變數）
 *   4. Unsplash Source API fallback（無需 key，最後備援）
 *
 * 使用方式：
 *   node generate-hero-image.js <slug>            # 單篇
 *   node generate-hero-image.js --all             # 全部文章
 *   node generate-hero-image.js --missing         # 只處理缺圖的文章
 *   PEXELS_API_KEY=xxx node generate-hero-image.js --all
 *
 * 輸出：
 *   dist/images/ai/<slug>-hero.jpg
 *   同步更新 dist/articles/<slug>.html 的 og:image meta tag
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'dist', 'images', 'ai');
const ARTICLES   = path.join(ROOT, 'dist', 'articles');
const BASE_URL   = 'https://bnotescoffee.com';

// ── Curated Unsplash photo mapping (slug → photo ID) ─────────────────────────
// 每個 ID 對應一張精選的 Unsplash 咖啡風格攝影作品
const SLUG_MAP = {
  'pour-over-guide':                     'photo-1495474472287-4d71bcdd2085',
  'pour-over-variable-complete-experiment': 'photo-1610632380989-680fe40816c6',
  'specialty-coffee-third-wave-history': 'photo-1501339847302-ac426a4a7cbb',
  'espresso-parameters':                 'photo-1514432324607-a09d9b4aefdd',
  'espresso-ratio-science':              'photo-1521302080334-4bebac2763a6',
  'latte-art':                           'photo-1534778101976-62847782c213',
  'cold-brew-complete-101':              'photo-1461023058943-07fcbe16d735',
  'cold-brew-advanced-science':          'photo-1517701604599-bb29b565090c',
  'water-quality':                       'photo-1548686304-89d188a80029',
  'roast-level-guide':                   'photo-1447933601403-0c6688de566e',
  'arabica-vs-robusta-complete-guide':   'photo-1495474472287-4d71bcdd2085',
  'processing-methods':                  'photo-1501339847302-ac426a4a7cbb',
  'single-origin-terroir-science':       'photo-1545665277-5937489579f2',
  'grinder-guide-2026':                  'photo-1559305616-3f99cd43e353',
  'grinder-6models-comparison-2026':     'photo-1559305616-3f99cd43e353',
  'milk-steaming-science':               'photo-1534778101976-62847782c213',
  'plant-milk-barista-complete-guide':   'photo-1559056199-641a0ac8b55e',
  'milk-alternatives-science-2026':      'photo-1559056199-641a0ac8b55e',
  'v60-vs-kalita-filter-geometry':       'photo-1495474472287-4d71bcdd2085',
  'coffee-acidity-complete-science':     'photo-1523906834658-6e24ef2386f9',
  'coffee-dessert-pairing-science':      'photo-1488477304112-4944851de03d',
  'coffee-equipment-cleaning-bible':     'photo-1559305616-3f99cd43e353',
  'coffee-reading-afternoon-ritual':     'photo-1506619216599-9d16d0903dfd',
  'cup-tasters-palate-training-guide':   'photo-1524350876685-274059332603',
  'sca-tasting-vocabulary-guide':        'photo-1523906834658-6e24ef2386f9',
  'competition-recipe-homebrew-guide':   'photo-1514432324607-a09d9b4aefdd',
  'home-coffee-corner':                  'photo-1498804103079-a6351b050096',
  'home-roasting-beginners-complete':    'photo-1447933601403-0c6688de566e',
  'nitro-cold-brew-home-guide':          'photo-1461023058943-07fcbe16d735',
  'turkish-coffee-ibrik':                'photo-1524350876685-274059332603',
  'green-bean-sourcing-complete-guide':  'photo-1501339847302-ac426a4a7cbb',
  'sustainable-coffee-complete-guide':   'photo-1545665277-5937489579f2',
  'kenya-aa-flavor-profile-deep':        'photo-1545665277-5937489579f2',
  'ethiopia-natural-process-deep-dive':  'photo-1545665277-5937489579f2',
  'ethiopia-vs-colombia-natural-showdown': 'photo-1545665277-5937489579f2',
  'colombia-main-harvest-selection':     'photo-1545665277-5937489579f2',
  'colombia-mitaca-second-harvest':      'photo-1545665277-5937489579f2',
  'alishan-terroir':                     'photo-1545665277-5937489579f2',
  'alishan-new-crop-w02':                'photo-1545665277-5937489579f2',
  'geisha-molecular-biology-2026':       'photo-1509042239860-f550ce710b93',
  'light-roast-beginners-guide':         'photo-1447933601403-0c6688de566e',
  'taipei-specialty-cafes':              'photo-1554118811-1e0d58224f24',
  'taipei-coffee-map-2026':              'photo-1554118811-1e0d58224f24',
  'taipei-coffee-expo-2026-complete-guide': 'photo-1554118811-1e0d58224f24',
  'taiwan-barista-2026-annual-review':   'photo-1521302080334-4bebac2763a6',
  'taiwan-coffee-farmer-summer-story':   'photo-1545665277-5937489579f2',
  'taiwan-coffee-equipment-midyear-2026': 'photo-1559305616-3f99cd43e353',
  'taiwan-coffee-subscription-guide-2026': 'photo-1498804103079-a6351b050096',
  'taiwan-specialty-coffee-whitepaper-2026': 'photo-1501339847302-ac426a4a7cbb',
  'wbc-2026-champion-technique-breakdown': 'photo-1545665277-5937489579f2',
  'wbrc-2026-roasting-analysis':         'photo-1447933601403-0c6688de566e',
  'wlac-2026-champion-technique':        'photo-1534778101976-62847782c213',
  'chiayi-coffee-festival-2026-guide':   'photo-1554118811-1e0d58224f24',
  'morning-coffee-ritual-science':       'photo-1506619216599-9d16d0903dfd',
  'summer-iced-coffee-three-recipes':    'photo-1461023058943-07fcbe16d735',
  'autumn-brewing-temperature-guide':    'photo-1495474472287-4d71bcdd2085',
  'winter-brewing-w04':                  'photo-1495474472287-4d71bcdd2085',
  'solo-brewing-valentines':             'photo-1506619216599-9d16d0903dfd',
  'christmas-coffee-gift-guide-2026':    'photo-1498804103079-a6351b050096',
  'new-years-eve-coffee-survival-guide': 'photo-1498804103079-a6351b050096',
  'international-coffee-day-10-stories': 'photo-1545665277-5937489579f2',
  'flavor-pairing-w03':                  'photo-1488477304112-4944851de03d',
  'brewing-diagnosis-w01':               'photo-1495474472287-4d71bcdd2085',
  '2026-coffee-keywords-annual-review':  'photo-1501339847302-ac426a4a7cbb',
  'bnotes-2026-annual-coffee-report':    'photo-1501339847302-ac426a4a7cbb',
  'world-coffee-weekly-vol1':            'photo-1501339847302-ac426a4a7cbb',
  'taiwan-coffee-farmer-summer-story':   'photo-1545665277-5937489579f2',
};

// ── Category fallback keywords (for Pexels API search) ───────────────────────
const CATEGORY_KEYWORDS = {
  '咖啡科學':   'specialty coffee science laboratory',
  '沖煮技術':   'coffee brewing pour over',
  '器材評測':   'coffee equipment grinder',
  '生豆產地':   'coffee farm origin beans',
  '烘豆知識':   'coffee roasting beans',
  '品飲訓練':   'coffee cupping tasting',
  '城市指南':   'coffee shop cafe interior',
  '生活風格':   'coffee lifestyle morning',
  '週報':       'coffee weekly review',
  '年度報告':   'coffee annual report',
  'default':    'specialty coffee cafe',
};

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BNotes/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function httpsJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BNotes/1.0', ...headers } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch(e) { reject(e); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Image source resolution ───────────────────────────────────────────────────
async function resolveImageUrl(slug) {
  // 1. Curated map
  if (SLUG_MAP[slug]) {
    const id = SLUG_MAP[slug];
    return `https://images.unsplash.com/${id}?w=1600&q=85&fm=jpg&fit=crop`;
  }

  // 2. Pexels API (if key available)
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    const category = detectCategory(slug);
    const query    = encodeURIComponent(CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.default);
    try {
      const data = await httpsJson(
        `https://api.pexels.com/v1/search?query=${query}&per_page=3&orientation=landscape`,
        { Authorization: pexelsKey }
      );
      if (data.photos && data.photos.length > 0) {
        // Pick a photo deterministically based on slug hash
        const idx = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % data.photos.length;
        return data.photos[idx].src.large2x;
      }
    } catch(e) {
      console.warn(`  ⚠ Pexels API failed: ${e.message}`);
    }
  }

  // 3. Unsplash Source fallback (no key needed)
  const category = detectCategory(slug);
  const keyword  = encodeURIComponent((CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.default).split(' ')[0]);
  return `https://source.unsplash.com/1600x900/?coffee,${keyword}`;
}

function detectCategory(slug) {
  if (/terroir|origin|ethiopia|colombia|kenya|alishan|taiwan-coffee-farm/.test(slug)) return '生豆產地';
  if (/roast|wbrc|light-roast|home-roasting/.test(slug)) return '烘豆知識';
  if (/grinder|equipment|gear|cleaning|v60|kalita/.test(slug)) return '器材評測';
  if (/pour-over|espresso|cold-brew|nitro|turkish|brewing|milk-steam/.test(slug)) return '沖煮技術';
  if (/science|acidity|chemistry|molecular|water|processing/.test(slug)) return '咖啡科學';
  if (/taipei|taiwan|chiayi|cafe|map/.test(slug)) return '城市指南';
  if (/tasting|cupping|sca|palate|flavor/.test(slug)) return '品飲訓練';
  if (/morning|ritual|reading|lifestyle|corner|solo|valentines|christmas|summer|winter|autumn/.test(slug)) return '生活風格';
  if (/weekly|vol[0-9]/.test(slug)) return '週報';
  if (/annual|report|whitepaper|review/.test(slug)) return '年度報告';
  return 'default';
}

// ── Core: download image for one slug ────────────────────────────────────────
async function generateHeroImage(slug) {
  const imgPath  = path.join(IMAGES_DIR, `${slug}-hero.jpg`);
  const htmlPath = path.join(ARTICLES,   `${slug}.html`);

  if (!fs.existsSync(htmlPath)) {
    console.error(`  ✗ Article not found: ${slug}`);
    return false;
  }

  console.log(`\n📷 ${slug}`);

  const imgUrl = await resolveImageUrl(slug);
  console.log(`  → ${imgUrl.substring(0, 80)}…`);

  const imgData = await httpsGet(imgUrl);
  if (imgData.length < 5000) {
    console.error(`  ✗ Download too small (${imgData.length} bytes) — skipping`);
    return false;
  }

  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.writeFileSync(imgPath, imgData);
  console.log(`  ✓ Saved ${Math.round(imgData.length/1024)}KB → ${path.relative(ROOT, imgPath)}`);

  // Update og:image in HTML
  updateOgImage(htmlPath, slug);
  return true;
}

function updateOgImage(htmlPath, slug) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const ogUrl = `${BASE_URL}/images/ai/${slug}-hero.jpg`;

  if (html.includes('property="og:image"')) {
    // Replace existing og:image
    html = html.replace(
      /<meta property="og:image"[^>]*>/,
      `<meta property="og:image" content="${ogUrl}">`
    );
  } else {
    // Insert after charset
    html = html.replace(
      '<meta charset="UTF-8">',
      `<meta charset="UTF-8">\n    <meta property="og:image" content="${ogUrl}">`
    );
  }

  fs.writeFileSync(htmlPath, html);
  console.log(`  ✓ og:image updated`);
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--all' || args[0] === '--missing') {
    const slugs = fs.readdirSync(ARTICLES)
      .filter(f => f.endsWith('.html') && f !== 'index.html')
      .map(f => f.replace('.html', ''));

    const toProcess = args[0] === '--missing'
      ? slugs.filter(s => !fs.existsSync(path.join(IMAGES_DIR, `${s}-hero.jpg`)))
      : slugs;

    console.log(`🚀 Processing ${toProcess.length} articles…`);
    let ok = 0, fail = 0;
    for (const slug of toProcess) {
      const result = await generateHeroImage(slug).catch(e => {
        console.error(`  ✗ Error: ${e.message}`);
        return false;
      });
      result ? ok++ : fail++;
    }
    console.log(`\n✅ Done — ${ok} OK, ${fail} failed`);

  } else if (args[0]) {
    await generateHeroImage(args[0]).catch(e => {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    });

  } else {
    console.log(`
Usage:
  node generate-hero-image.js <slug>           # 單篇文章
  node generate-hero-image.js --all            # 全部文章
  node generate-hero-image.js --missing        # 只處理缺圖文章

環境變數（可選）:
  PEXELS_API_KEY=xxx    啟用 Pexels API 動態搜尋（免費申請：pexels.com/api）
`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
