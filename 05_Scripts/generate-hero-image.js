#!/usr/bin/env node
/**
 * BNotes Hero Image Generator v3
 * ────────────────────────────────────────────────────────────────────────────
 * 優先順序（上到下自動降級）：
 *   1. Google Imagen 4（最佳品牌一致性 — AI 生成，統一風格）
 *      需設定環境變數: GOOGLE_AI_KEY
 *      取得方式: https://aistudio.google.com/apikey
 *
 *   2. Unsplash Search API（精確主題搜尋）
 *      需設定環境變數: UNSPLASH_ACCESS_KEY
 *      免費申請: https://unsplash.com/oauth/applications
 *
 *   3. 精選映射表 SLUG_MAP（高品質 curated IDs，無需 key）
 *
 *   4. Pexels API（類別關鍵字搜尋）
 *      需設定環境變數: PEXELS_API_KEY
 *      免費申請: https://www.pexels.com/api/
 *
 *   5. Unsplash Source 隨機（最後備援，無需 key）
 *
 * 使用方式：
 *   node generate-hero-image.js <slug>              # 單篇（已有圖則跳過）
 *   node generate-hero-image.js <slug> --force      # 單篇強制重新產圖
 *   node generate-hero-image.js --all               # 全部（已有圖自動跳過）
 *   node generate-hero-image.js --all --force       # 全部強制重新產圖
 *   node generate-hero-image.js --missing           # 只處理缺圖文章
 *
 *   GOOGLE_AI_KEY=xxx node generate-hero-image.js --missing   # 最佳品牌一致性
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'dist', 'images', 'ai');
const ARTICLES   = path.join(ROOT, 'dist', 'articles');
const BASE_URL   = 'https://bnotescoffee.com';

// ── Per-article Unsplash search terms ────────────────────────────────────────
// 每篇文章的精確搜尋詞，供 Unsplash Search API 使用
// 當 UNSPLASH_ACCESS_KEY 設定時，這是最高優先級
const SLUG_SEARCH_TERMS = {
  // 手沖技法
  'pour-over-guide':                         'pour over coffee gooseneck kettle drip',
  'pour-over-variable-complete-experiment':  'coffee brewing experiment scale timer',
  'v60-vs-kalita-filter-geometry':           'v60 coffee dripper filter cone',
  'water-quality':                           'water pouring coffee science mineral',
  'brewing-diagnosis-w01':                   'coffee extraction troubleshoot diagnosis',
  'cold-brew-complete-101':                  'cold brew coffee glass jar overnight',
  'cold-brew-advanced-science':              'cold brew coffee science laboratory',
  'nitro-cold-brew-home-guide':              'nitro cold brew coffee bubbles dark',
  'summer-iced-coffee-three-recipes':        'iced coffee summer refreshing ice',
  'competition-recipe-homebrew-guide':       'competition barista recipe home brewing',
  'autumn-brewing-temperature-guide':        'autumn fall coffee warm cozy season',
  'winter-brewing-w04':                      'winter morning coffee cozy fireplace snow',

  // 義式咖啡
  'espresso-parameters':                     'espresso machine extraction professional',
  'espresso-ratio-science':                  'espresso shot crema ratio golden',
  'latte-art':                               'latte art milk foam rosetta heart',
  'milk-steaming-science':                   'barista steam wand milk steaming',
  'plant-milk-barista-complete-guide':       'oat milk coffee barista plant alternative',
  'milk-alternatives-science-2026':          'plant milk varieties almond oat soy',
  'wlac-2026-champion-technique':            'latte art world championship competition',

  // 磨豆機 / 器材
  'grinder-guide-2026':                      'coffee hand grinder burr manual',
  'grinder-6models-comparison-2026':         'coffee grinder burr comparison review',
  'coffee-equipment-cleaning-bible':         'coffee equipment cleaning maintenance',
  'taiwan-coffee-equipment-midyear-2026':    'coffee equipment tools professional',
  'home-coffee-corner':                      'home coffee station setup corner',

  // 烘豆
  'roast-level-guide':                       'coffee roasting beans drum roaster',
  'home-roasting-beginners-complete':        'home coffee roasting popcorn machine beans',
  'light-roast-beginners-guide':             'light roast coffee beans pale golden',
  'wbrc-2026-roasting-analysis':             'coffee roasting world championship competition',

  // 品飲 / 感官
  'cup-tasters-palate-training-guide':       'coffee cupping tasting spoons bowls',
  'sca-tasting-vocabulary-guide':            'coffee flavor wheel tasting notes',
  'coffee-acidity-complete-science':         'bright acidic coffee lemon citrus',
  'coffee-dessert-pairing-science':          'coffee dessert cake pastry pairing',
  'flavor-pairing-w03':                      'coffee food flavor pairing match',

  // 產地 / 風土
  'single-origin-terroir-science':           'coffee single origin farm terroir landscape',
  'kenya-aa-flavor-profile-deep':            'Kenya coffee cherry berries red branch',
  'ethiopia-natural-process-deep-dive':      'Ethiopia coffee natural drying raised beds',
  'ethiopia-vs-colombia-natural-showdown':   'coffee origins comparison Africa South America',
  'colombia-main-harvest-selection':         'Colombia coffee mountain farm harvest picking',
  'colombia-mitaca-second-harvest':          'Colombia coffee harvest workers mountain',
  'alishan-terroir':                         'Taiwan Alishan mountain tea plantation fog',
  'alishan-new-crop-w02':                    'Taiwan mountain mist green farm altitude',
  'geisha-molecular-biology-2026':           'geisha coffee specialty Panama floral',
  'green-bean-sourcing-complete-guide':      'green coffee beans raw unroasted sourcing',
  'processing-methods':                      'coffee natural washed honey processing drying',
  'taiwan-coffee-farmer-summer-story':       'small coffee farm worker family summer',

  // 咖啡廳 / 城市
  'taipei-specialty-cafes':                  'specialty coffee shop cafe interior design',
  'taipei-coffee-map-2026':                  'coffee shop city street map explore',
  'taipei-coffee-expo-2026-complete-guide':  'coffee exhibition expo event fair crowd',
  'chiayi-coffee-festival-2026-guide':       'outdoor coffee festival market event Taiwan',

  // 知識 / 歷史
  'arabica-vs-robusta-complete-guide':       'arabica robusta coffee beans comparison types',
  'specialty-coffee-third-wave-history':     'specialty coffee third wave history cafe',
  'sustainable-coffee-complete-guide':       'sustainable coffee eco green environmental',
  'taiwan-specialty-coffee-whitepaper-2026': 'specialty coffee knowledge guide learning',

  // 賽事
  'wbc-2026-champion-technique-breakdown':   'world barista championship competition stage',

  // 生活風格 / 季節
  'morning-coffee-ritual-science':           'morning coffee ritual sunrise peaceful',
  'coffee-reading-afternoon-ritual':         'coffee reading book afternoon cozy',
  'solo-brewing-valentines':                 'solo coffee brewing alone peaceful mindful',
  'christmas-coffee-gift-guide-2026':        'christmas coffee gift holiday festive',
  'new-years-eve-coffee-survival-guide':     'new year night city coffee celebration',
  'international-coffee-day-10-stories':     'international coffee day celebration world',
  'taiwan-coffee-subscription-guide-2026':   'coffee subscription box monthly delivery',

  // 土耳其咖啡
  'turkish-coffee-ibrik':                    'turkish coffee ibrik cezve traditional brass',

  // 年度 / 週報
  '2026-coffee-keywords-annual-review':      'coffee year review 2026 trending',
  'bnotes-2026-annual-coffee-report':        'coffee annual report notebook writing',
  'world-coffee-weekly-vol1':                'coffee news weekly digest reading',
  'taiwan-barista-2026-annual-review':       'barista annual review year professional',
};

// ── Curated Unsplash photo IDs (fallback when no API key) ────────────────────
// 注意：每個 slug 應對應唯一、主題吻合的 photo ID
// 若有 UNSPLASH_ACCESS_KEY，會用 SLUG_SEARCH_TERMS 取代此 map
const SLUG_MAP = {
  // 手沖技法
  'pour-over-guide':                         'photo-1495474472287-4d71bcdd2085', // gooseneck pour over ✓
  'pour-over-variable-complete-experiment':  'photo-1610632380989-680fe40816c6', // scale + kettle ✓
  'v60-vs-kalita-filter-geometry':           'photo-1524350876685-274059332603', // filter dripper
  'water-quality':                           'photo-1548686304-89d188a80029', // water ✓
  'brewing-diagnosis-w01':                   'photo-1610632380989-680fe40816c6', // brewing + scale ✓
  'cold-brew-complete-101':                  'photo-1461023058943-07fcbe16d735', // cold brew jar ✓
  'cold-brew-advanced-science':              'photo-1517701604599-bb29b565090c', // cold brew science ✓
  'nitro-cold-brew-home-guide':              'photo-1559305616-3f99cd43e353',   // bubbles/grinder (repurpose)
  'summer-iced-coffee-three-recipes':        'photo-1461023058943-07fcbe16d735', // iced coffee
  'competition-recipe-homebrew-guide':       'photo-1552346154-21d32810aba3',   // barista working
  'autumn-brewing-temperature-guide':        'photo-1506619216599-9d16d0903dfd', // warm morning coffee
  'winter-brewing-w04':                      'photo-1498804103079-a6351b050096', // cozy home coffee

  // 義式咖啡
  'espresso-parameters':                     'photo-1514432324607-a09d9b4aefdd', // espresso machine ✓
  'espresso-ratio-science':                  'photo-1521302080334-4bebac2763a6', // espresso shot ✓
  'latte-art':                               'photo-1534778101976-62847782c213', // latte art ✓
  'milk-steaming-science':                   'photo-1534778101976-62847782c213', // milk foam latte ✓
  'plant-milk-barista-complete-guide':       'photo-1559056199-641a0ac8b55e',   // oat milk ✓
  'milk-alternatives-science-2026':          'photo-1559056199-641a0ac8b55e',   // plant milk
  'wlac-2026-champion-technique':            'photo-1534778101976-62847782c213', // latte art champion ✓

  // 磨豆機 / 器材
  'grinder-guide-2026':                      'photo-1559305616-3f99cd43e353',   // hand grinder ✓
  'grinder-6models-comparison-2026':         'photo-1559305616-3f99cd43e353',   // coffee grinder ✓
  'coffee-equipment-cleaning-bible':         'photo-1590502593747-42a996133562', // tools/equipment
  'taiwan-coffee-equipment-midyear-2026':    'photo-1472552944129-b035e9ea3744', // coffee gear
  'home-coffee-corner':                      'photo-1498804103079-a6351b050096', // home setup ✓

  // 烘豆
  'roast-level-guide':                       'photo-1447933601403-0c6688de566e', // dark roast beans ✓
  'home-roasting-beginners-complete':        'photo-1447933601403-0c6688de566e', // roasting
  'light-roast-beginners-guide':             'photo-1523906834658-6e24ef2386f9', // light coffee
  'wbrc-2026-roasting-analysis':             'photo-1580933073521-dc49ac0d4e6a', // roasting competition

  // 品飲 / 感官
  'cup-tasters-palate-training-guide':       'photo-1524350876685-274059332603', // cupping ✓
  'sca-tasting-vocabulary-guide':            'photo-1572119865084-43c285814d63', // flavor wheel tasting
  'coffee-acidity-complete-science':         'photo-1523906834658-6e24ef2386f9', // bright coffee ✓
  'coffee-dessert-pairing-science':          'photo-1488477304112-4944851de03d', // dessert + coffee ✓
  'flavor-pairing-w03':                      'photo-1558160074-4d7d8bdf4256',   // food pairing

  // 產地 / 風土
  'single-origin-terroir-science':           'photo-1545665277-5937489579f2',   // farm terroir ✓
  'kenya-aa-flavor-profile-deep':            'photo-1512314889357-e157c22f938d', // coffee cherries berries
  'ethiopia-natural-process-deep-dive':      'photo-1578374173705-969cbe6f2d6b', // drying beds
  'ethiopia-vs-colombia-natural-showdown':   'photo-1528360983277-13d401cdc186', // coffee farm comparison
  'colombia-main-harvest-selection':         'photo-1528360983277-13d401cdc186', // coffee farm harvest ✓
  'colombia-mitaca-second-harvest':          'photo-1545665277-5937489579f2',   // coffee origin ✓
  'alishan-terroir':                         'photo-1545665277-5937489579f2',   // coffee farm altitude ✓
  'alishan-new-crop-w02':                    'photo-1501339847302-ac426a4a7cbb', // specialty origin
  'geisha-molecular-biology-2026':           'photo-1509042239860-f550ce710b93', // specialty geisha ✓
  'green-bean-sourcing-complete-guide':      'photo-1509042239860-f550ce710b93', // green/specialty beans
  'processing-methods':                      'photo-1528360983277-13d401cdc186', // coffee farm process
  'taiwan-coffee-farmer-summer-story':       'photo-1545665277-5937489579f2',   // coffee farm ✓

  // 咖啡廳 / 城市
  'taipei-specialty-cafes':                  'photo-1554118811-1e0d58224f24',   // cafe interior ✓
  'taipei-coffee-map-2026':                  'photo-1509785307050-d4066910ec1e', // coffee shop map
  'taipei-coffee-expo-2026-complete-guide':  'photo-1521017432531-fbd92d768814', // coffee expo event
  'chiayi-coffee-festival-2026-guide':       'photo-1442512595331-e89e73853f31', // outdoor festival

  // 知識 / 歷史
  'arabica-vs-robusta-complete-guide':       'photo-1447933601403-0c6688de566e', // coffee beans ✓
  'specialty-coffee-third-wave-history':     'photo-1501339847302-ac426a4a7cbb', // specialty cafe ✓
  'sustainable-coffee-complete-guide':       'photo-1472552944129-b035e9ea3744', // eco coffee bags
  'taiwan-specialty-coffee-whitepaper-2026': 'photo-1507842217343-583bb7270b66', // knowledge/library

  // 賽事
  'wbc-2026-champion-technique-breakdown':   'photo-1552346154-21d32810aba3',   // professional barista ✓

  // 生活風格 / 季節
  'morning-coffee-ritual-science':           'photo-1506619216599-9d16d0903dfd', // morning ✓
  'coffee-reading-afternoon-ritual':         'photo-1436076863939-06870fe779c2', // reading + coffee
  'solo-brewing-valentines':                 'photo-1506794778202-cad84cf45f1d', // solo brewing
  'christmas-coffee-gift-guide-2026':        'photo-1543286386-713bdd548da4',   // christmas gifts
  'new-years-eve-coffee-survival-guide':     'photo-1506619216599-9d16d0903dfd', // night coffee ritual ✓
  'international-coffee-day-10-stories':     'photo-1501339847302-ac426a4a7cbb', // specialty coffee world ✓
  'taiwan-coffee-subscription-guide-2026':   'photo-1578070181910-f1e514afdd08', // subscription box

  // 土耳其咖啡
  'turkish-coffee-ibrik':                    'photo-1570968915860-54d5c301fa9f', // turkish ibrik ✓

  // 年度 / 週報
  '2026-coffee-keywords-annual-review':      'photo-1551033406-611cf9a28f67',   // notebook annual
  'bnotes-2026-annual-coffee-report':        'photo-1586880244406-556ebe35f282', // report review
  'world-coffee-weekly-vol1':                'photo-1511920170033-f8396924c348', // weekly reading
  'taiwan-barista-2026-annual-review':       'photo-1552346154-21d32810aba3',   // barista review
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

// ── BNotes Brand Style Template（Imagen 4 固定風格）────────────────────────────
// 所有 AI 生成圖片共用此風格描述，確保視覺一致性
// 調整此 template 即可改變全站圖片風格
const IMAGEN_STYLE_TEMPLATE =
  'specialty coffee photography, warm natural light, shallow depth of field, ' +
  'muted earth tones and warm browns, artisanal cafe aesthetic, ' +
  'dark wooden surface or natural linen background, ' +
  'film grain texture, professional editorial photography, ' +
  'no text overlay, no people, no faces, ' +
  '16:9 landscape orientation, high quality';

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BNotes/2.0', ...headers } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function httpsJson(url, headers = {}) {
  const { body } = await httpsGet(url, headers);
  return JSON.parse(body.toString());
}

function httpsPost(url, bodyObj, headers = {}) {
  return new Promise((resolve, reject) => {
    const data    = JSON.stringify(bodyObj);
    const urlObj  = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent':     'BNotes/3.0',
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data',  c => chunks.push(c));
      res.on('end',   () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Google Imagen 4（品牌一致性最佳）────────────────────────────────────────────
// 返回 Buffer（圖片二進位），或 null（失敗時）
async function imagenGenerate(slug) {
  const key = process.env.GOOGLE_AI_KEY;
  if (!key) return null;

  const subject = SLUG_SEARCH_TERMS[slug] || (detectCategory(slug) + ' coffee equipment');
  const prompt  = `${subject}, ${IMAGEN_STYLE_TEMPLATE}`;

  try {
    const res = await httpsPost(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`,
      {
        instances:  [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9', safetyFilterLevel: 'block_some' },
      }
    );

    const result = JSON.parse(res.body.toString());
    if (result.predictions && result.predictions[0] && result.predictions[0].bytesBase64Encoded) {
      console.log(`  🎨 Imagen 4 → "${subject.substring(0, 60)}…"`);
      return Buffer.from(result.predictions[0].bytesBase64Encoded, 'base64');
    }
    if (result.error) {
      console.warn(`  ⚠ Imagen 4 API error: ${result.error.message}`);
    }
  } catch(e) {
    console.warn(`  ⚠ Imagen 4 failed: ${e.message}`);
  }
  return null;
}

// ── Unsplash Search API ───────────────────────────────────────────────────────
// 使用 UNSPLASH_ACCESS_KEY 搜尋最吻合文章主題的圖片
async function unsplashSearch(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const q   = encodeURIComponent(query);
  const url = `https://api.unsplash.com/search/photos?query=${q}&per_page=5&orientation=landscape&content_filter=high&client_id=${key}`;

  try {
    const data = await httpsJson(url);
    if (data.results && data.results.length > 0) {
      // 取第一筆（最相關）
      const photo = data.results[0];
      console.log(`  🔍 Unsplash search "${query}" → ${photo.id}`);
      // 使用 regular 尺寸（約 1080px 寬），加上高品質參數
      return photo.urls.raw + '?w=1600&q=85&fm=jpg&fit=crop&crop=entropy';
    }
  } catch(e) {
    console.warn(`  ⚠ Unsplash search failed: ${e.message}`);
  }
  return null;
}

// ── Image source resolution ───────────────────────────────────────────────────
async function resolveImageUrl(slug) {
  // 1. Unsplash Search API（最精確，需 key）
  const searchTerms = SLUG_SEARCH_TERMS[slug];
  if (searchTerms) {
    const url = await unsplashSearch(searchTerms);
    if (url) return url;
  }

  // 2. Curated SLUG_MAP（高品質 curated，無需 key）
  if (SLUG_MAP[slug]) {
    const id = SLUG_MAP[slug];
    return `https://images.unsplash.com/${id}?w=1600&q=85&fm=jpg&fit=crop`;
  }

  // 3. Pexels API（類別關鍵字搜尋，需 key）
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    const category = detectCategory(slug);
    const query    = encodeURIComponent(CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.default);
    try {
      const data = await httpsJson(
        `https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape`,
        { Authorization: pexelsKey }
      );
      if (data.photos && data.photos.length > 0) {
        const idx = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % data.photos.length;
        return data.photos[idx].src.large2x;
      }
    } catch(e) {
      console.warn(`  ⚠ Pexels API failed: ${e.message}`);
    }
  }

  // 4. Unsplash Source fallback（隨機，無需 key）
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

// ── Core: generate image for one slug ────────────────────────────────────────
async function generateHeroImage(slug, forceRegenerate = false) {
  const imgPath  = path.join(IMAGES_DIR, `${slug}-hero.jpg`);
  const htmlPath = path.join(ARTICLES,   `${slug}.html`);

  if (!fs.existsSync(htmlPath)) {
    console.error(`  ✗ Article not found: ${slug}`);
    return false;
  }

  // ── Skip-if-exists：已有合適圖卡則跳過，不重新產圖 ─────────────────────────
  if (!forceRegenerate && fs.existsSync(imgPath)) {
    const stat = fs.statSync(imgPath);
    if (stat.size > 5000) {
      console.log(`  ⏭  ${slug} — 已有圖卡 (${Math.round(stat.size/1024)}KB)，跳過`);
      return true;
    }
  }

  console.log(`\n📷 ${slug}`);
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // ── 優先：Imagen 4 AI 生成（品牌一致性最佳）──────────────────────────────────
  const imagenBuffer = await imagenGenerate(slug);
  if (imagenBuffer) {
    fs.writeFileSync(imgPath, imagenBuffer);
    console.log(`  ✓ Saved ${Math.round(imagenBuffer.length/1024)}KB → ${path.relative(ROOT, imgPath)}`);
    updateOgImage(htmlPath, slug);
    return true;
  }

  // ── 降級：URL 系列（Unsplash Search → SLUG_MAP → Pexels → Fallback）──────────
  const imgUrl = await resolveImageUrl(slug);
  console.log(`  → ${imgUrl.substring(0, 80)}…`);

  const { body: imgData } = await httpsGet(imgUrl);
  if (imgData.length < 5000) {
    console.error(`  ✗ Download too small (${imgData.length} bytes) — skipping`);
    return false;
  }

  fs.writeFileSync(imgPath, imgData);
  console.log(`  ✓ Saved ${Math.round(imgData.length/1024)}KB → ${path.relative(ROOT, imgPath)}`);
  updateOgImage(htmlPath, slug);
  return true;
}

function updateOgImage(htmlPath, slug) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const ogUrl = `${BASE_URL}/images/ai/${slug}-hero.jpg`;

  if (html.includes('property="og:image"')) {
    html = html.replace(
      /<meta property="og:image"[^>]*>/,
      `<meta property="og:image" content="${ogUrl}">`
    );
  } else {
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
  const args    = process.argv.slice(2);
  const force   = args.includes('--force');
  const mainArg = args.find(a => !a.startsWith('--'));

  // Show API status
  const hasGoogle   = !!process.env.GOOGLE_AI_KEY;
  const hasUnsplash = !!process.env.UNSPLASH_ACCESS_KEY;
  const hasPexels   = !!process.env.PEXELS_API_KEY;

  console.log(`\n🔑 API Keys:`);
  console.log(`   Imagen 4  (Google)   = ${hasGoogle   ? '✅ 品牌一致 AI 生成' : '❌ 未設定'}`);
  console.log(`   Unsplash Search      = ${hasUnsplash ? '✅ 精確主題搜尋'    : '❌ 未設定'}`);
  console.log(`   Pexels               = ${hasPexels   ? '✅'                : '❌ 未設定'}`);
  if (!hasGoogle) {
    console.log(`\n   ⚡ 建議設定 Imagen 4 key 以達最佳品牌一致性`);
    console.log(`      取得: https://aistudio.google.com/apikey`);
    console.log(`      用法: GOOGLE_AI_KEY=xxx node generate-hero-image.js --missing\n`);
  }
  if (force) console.log(`   ⚡ --force 模式：強制重新產圖（忽略已有圖卡）\n`);

  if (args[0] === '--all' || args[0] === '--missing') {
    const slugs = fs.readdirSync(ARTICLES)
      .filter(f => f.endsWith('.html') && f !== 'index.html')
      .map(f => f.replace('.html', ''));

    const toProcess = args[0] === '--missing'
      ? slugs.filter(s => !fs.existsSync(path.join(IMAGES_DIR, `${s}-hero.jpg`)))
      : slugs;

    console.log(`🚀 Processing ${toProcess.length} articles…`);
    let ok = 0, skipped = 0, fail = 0;
    for (const slug of toProcess) {
      const before = fs.existsSync(path.join(IMAGES_DIR, `${slug}-hero.jpg`));
      const result = await generateHeroImage(slug, force).catch(e => {
        console.error(`  ✗ Error: ${e.message}`);
        return false;
      });
      if (!result) { fail++; }
      else if (!force && before) { skipped++; }
      else { ok++; }
    }
    console.log(`\n✅ Done — ${ok} 新產圖, ${skipped} 跳過（已有）, ${fail} 失敗`);

  } else if (mainArg) {
    await generateHeroImage(mainArg, force).catch(e => {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    });

  } else {
    console.log(`
使用方式：
  node generate-hero-image.js <slug>              # 單篇（已有圖自動跳過）
  node generate-hero-image.js <slug> --force      # 單篇強制重新產圖
  node generate-hero-image.js --all               # 全部（已有圖自動跳過）
  node generate-hero-image.js --all --force       # 全部強制重新產圖
  node generate-hero-image.js --missing           # 只處理缺圖文章

環境變數（優先順序）：
  GOOGLE_AI_KEY=xxx         Google AI Studio API key（Imagen 4，品牌一致性最佳）
                            取得: https://aistudio.google.com/apikey
  UNSPLASH_ACCESS_KEY=xxx   Unsplash 精確搜尋
                            申請: https://unsplash.com/oauth/applications
  PEXELS_API_KEY=xxx        Pexels 備援
                            申請: https://www.pexels.com/api/
`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
