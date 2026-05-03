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
  'pour-over-guide':                         'gooseneck kettle pouring thin precise stream over white Hario V60 dripper on wooden stand, fresh dark drip collecting in clear glass server below, soft window light from left, vapor rising from bloom, specialty coffee pour-over technique editorial',
  'pour-over-variable-complete-experiment':  'multiple V60 drippers in a row each at different bloom stages on lab bench, Acaia Pearl scale displaying grams, glass beakers measuring water temperatures, scientific systematic approach to specialty coffee brewing variables, editorial flat-lay',
  'v60-vs-kalita-filter-geometry':           'Hario V60 02 and Kalita Wave 155 placed side by side on wooden surface, spiral ribbing and flat-bottom geometry clearly visible in warm studio light, two ceramic drippers comparison, specialty coffee filter geometry editorial product photography',
  'water-quality':                           'close-up sparkling mineral water poured into laboratory glass beaker beside specialty coffee, TDS meter and pH strips on white marble surface, water science coffee brewing concept, clean editorial photography mineral analysis',
  'brewing-diagnosis-w01':                   'close-up V60 filter showing uneven extraction pattern, some grounds pale and underdeveloped, some areas dark over-extracted, diagnostic detail of espresso puck after shot, barista analyzing coffee extraction results, troubleshooting specialty coffee brewing science editorial',
  'cold-brew-complete-101':                  'glass mason jar tightly packed with coarsely ground dark coffee slowly steeping in cool water, kitchen counter in soft dusk light, gradual cold extraction process over time, condensation on glass jar exterior, specialty coffee cold brew overnight ritual editorial',
  'cold-brew-advanced-science':              'laboratory scene with glass beakers of cold brew concentrate at different steep times labeled 12h 18h 24h, refractometer showing TDS reading beside coffee samples, cold brew science experimentation, dark liquid coffee in glass flasks, precise specialty coffee extraction science editorial',
  'nitro-cold-brew-home-guide':              'nitrogen tap head dispensing cascading dark nitro cold brew into clear pint glass, creamy nitrogen bubbles creating thick white head from bottom to top, home bar counter setup, dramatic side lighting, thick velvety cold brew texture like dark stout, specialty nitro coffee brewing editorial',
  'summer-iced-coffee-three-recipes':        'three tall glasses of different summer iced coffee preparations on wooden tray — Japanese iced pour-over with clear ice cubes, mason jar cold brew, shaken espresso with ice and foam — refreshing summer afternoon light, specialty iced coffee trio editorial',
  'competition-recipe-homebrew-guide':       'home barista replicating World Barista Championship recipe, Acaia Pearl scale showing precise 1:2.5 ratio, competition-grade extraction timer counting, professional portafilter technique at home espresso machine, championship-inspired home espresso setup editorial',
  'autumn-brewing-temperature-guide':        'hands wrapping around large ceramic mug of pour-over coffee, fallen maple leaves on dark wooden table beside spilled brewing journal with temperature notes, autumn morning light through window, steam curling upward, cozy seasonal coffee ritual warm earth tones editorial',
  'winter-brewing-w04':                      'ceramic V60 dripper on wooden stand in foreground, soft orange fireplace glow behind it, winter morning view through frosted window with snow outside, steam rising from pour-over into cold indoor air, quiet solitary winter coffee ritual, warm amber light against cold blue night',

  // 義式咖啡
  'espresso-parameters':                     'honey-thick golden espresso crema streaming into white demitasse from portafilter, pressure gauge visible in background showing 9 bar, barista timer counting 27 seconds extraction, professional coffee bar counter, precise espresso parameters science, editorial close-up extraction shot',
  'espresso-ratio-science':                  'espresso shot glass on Acaia scale displaying 36g out, 18g portafilter dose beside it, golden crema thick on black espresso surface, science of 1:2 extraction ratio clearly shown, white marble surface, laboratory-style specialty coffee extraction measurement editorial photography',
  'latte-art':                               'barista hands pouring steamed milk in delicate tulip pattern into wide white ceramic cup with double espresso, milk and coffee merging at precise pour angle, warm coffee bar counter, bokeh cafe background, latte art creation decisive moment, specialty coffee barista skill editorial',
  'milk-steaming-science':                   'close-up of steam wand tip submerged in stainless steel milk pitcher at precise angle, tight micro-foam vortex forming, silver steam wand entering creamy white milk, barista wrist angle clearly visible, milk steaming science targeting 65 degrees, editorial barista technique close-up',
  'plant-milk-barista-complete-guide':       'barista hands steaming oat milk in metal pitcher beside espresso machine, oat milk latte art heart being poured into ceramic cup, coffee bar counter, warm soft editorial light, plant-based milk coffee science perspective',
  'milk-alternatives-science-2026':          'five small glass pitchers lined up containing oat almond soy coconut macadamia milk, each showing different foam texture beside an espresso shot, plant-based milk barista comparison, warm editorial light, specialty coffee alternative milk science guide editorial',
  'wlac-2026-champion-technique':            'World Latte Art Championship competition stage, champion barista in competition apron executing perfect free-pour tulip in high-pressure stage environment, judges watching at table, dramatic spotlights, championship trophy display in background, global latte art competition atmosphere',

  // 磨豆機 / 器材
  'grinder-guide-2026':                      'Comandante C40 hand grinder standing upright on dark wooden surface, three small piles of coffee grounds at different coarseness settings beside it, warm side light revealing burr grind quality and particle size uniformity, specialty coffee hand grinder guide editorial',
  'grinder-6models-comparison-2026':         'six different hand coffee grinders lined up in a row from budget to premium on dark wooden surface, varying sizes and finishes, each with small sample of its grind output showing particle consistency, specialty coffee grinder comparison guide editorial photography',
  'coffee-equipment-cleaning-bible':         'hand grinder disassembled burrs beside ceramic V60 filter cup and gooseneck pour-over kettle, cleaning brush, microfiber cloth, warm editorial flat-lay on light wood surface, pour-over hand-brew equipment maintenance',
  'taiwan-coffee-equipment-midyear-2026':    'curated selection of specialty coffee equipment on dark wood surface — ceramic dripper, gooseneck kettle, Acaia scale, elegant mug — arranged in editorial flat-lay, warm side light, Taiwan coffee equipment mid-year editorial selection photography',
  'home-coffee-corner':                      'cozy home coffee station corner with Hario V60 dripper, Fellow Stagg kettle, specialty single-origin coffee bag, small succulent plant, morning light from nearby window casting soft shadows on wooden shelf, warm domestic coffee ritual setup editorial',

  // 烘豆
  'roast-level-guide':                       'three white ceramic ramekins side by side showing light roast pale cinnamon beans, medium roast warm brown beans, dark roast nearly black oily beans, clear progression of coffee roasting levels, overhead flat-lay, warm editorial photography, roast level comparison guide',
  'home-roasting-beginners-complete':        'air popcorn popper repurposed for home coffee roasting with green beans transforming to brown inside clear chamber, first crack moment with chaff flying, home kitchen counter, beginner home coffee roasting adventure, warm kitchen light, accessible entry-level roasting hobby editorial',
  'light-roast-beginners-guide':             'light roasted single-origin coffee beans pale cinnamon color spilling from small kraft bag onto white marble surface, printed origin label visible, bright morning light, visual lightness suggesting delicate floral aromatics, accessible light roast specialty coffee beginner editorial',
  'wbrc-2026-roasting-analysis':             'World Barista Roasting Championship 2026 professional drum roaster with digital temperature probe display, roasting log sheet with development time ratio data plotted on graph, competition roasted bean samples in labeled test tins, professional roasting competition analysis editorial',

  // 品飲 / 感官
  'cup-tasters-palate-training-guide':       'SCA professional cupping setup with six identical white cupping bowls in a row, each containing dry grounds from different single origins, cupping spoons laid across bowls, score sheets and aroma reference jars beside each bowl, warm editorial light, palate training guide',
  'sca-tasting-vocabulary-guide':            'large SCA coffee flavor wheel laid flat on wooden table, specialty coffee cupping spoon placed across center, several small glass cupping bowls with black coffee visible, official tasting vocabulary reference guide concept, editorial documentary photography, coffee sensory science',
  'coffee-acidity-complete-science':         'specialty coffee black drip coffee in clear glass, bright lemon wedge beside it on white marble, pH test strips, science acidity concept, dark rich coffee liquid clearly visible',
  'coffee-dessert-pairing-science':          'espresso demitasse beside slice of tiramisu, specialty pour-over in clear glass beside almond financier, scientific flavor compound pairing concept, warm cafe marble table, editorial food photography, coffee and dessert pairing exploration, warm afternoon light',
  'flavor-pairing-w03':                      'seasonal specialty coffee cup surrounded by flavor complement ingredients — lemon wedge, dark chocolate square, cinnamon stick, cardamom pod — arranged on white marble, flavor pairing research concept, editorial product photography, warm soft light, specialty coffee food science',

  // 產地 / 風土
  'single-origin-terroir-science':           'overhead aerial-style view of specialty coffee farm showing rich red volcanic soil between rows of coffee plants, ripe red cherries visible on branches below, valley mist in distance, terroir science concept, single origin coffee growing environment, editorial farm photography',
  'kenya-aa-flavor-profile-deep':            'Kenya AA coffee SL28 ripe cherries on branch with rich red African volcanic soil visible in foreground, lush green leaves, golden afternoon highland light, berry-like quality editorial photography, Kenya coffee terroir',
  'ethiopia-natural-process-deep-dive':      'Ethiopia natural process coffee fermentation close-up, ripe red cherries piled on raised drying beds with visible mucilage glistening, warm golden afternoon light, scientific documentary style, fermentation process visible',
  'ethiopia-vs-colombia-natural-showdown':   'two side-by-side specialty coffee scenes — Ethiopian raised drying beds with natural process red cherries glistening in sun versus Colombian washed coffee with crystal water channels — origin showdown concept, editorial contrast photography',
  'colombia-main-harvest-selection':         'coffee worker hands sorting through freshly picked bright red Colombian coffee cherries, denim jacket sleeve, mountain farm terraces with green Colombian highlands visible in background, main harvest season energy, specialty coffee harvest selection editorial',
  'colombia-mitaca-second-harvest':          'misty Colombian coffee mountain landscape in second mitaca harvest season, coffee trees bearing smaller secondary crop of red and yellow cherries, farmers working terraced hillsides in distance, cloud-forest atmosphere, mitaca harvest documentary editorial',
  'alishan-terroir':                         'high-altitude Alishan mountain coffee farm in Taiwan shrouded in morning mist, rows of coffee trees with visible red cherries, cool mountain air concept, terraced farm on steep hillside, Taiwan mountain terroir unique coffee growing conditions, golden morning light editorial',
  'alishan-new-crop-w02':                    'fresh new crop Alishan coffee cherries close-up, partially ripe red-yellow on branch, Taiwanese mountain farm with mist-filled valley below, dewy morning light, new harvest season quality editorial, Taiwan specialty coffee high-altitude growing region, fresh crop anticipation',
  'geisha-molecular-biology-2026':           'Hacienda La Esmeralda Panama Geisha coffee cherries on branch with distinctive elongated bean shape, SCA cupping glasses arranged on white marble, jasmine and bergamot flowers as aroma reference beside coffee, geisha specialty coffee molecular biology science editorial',
  'green-bean-sourcing-complete-guide':      'burlap sacks of green unroasted coffee beans from multiple origins — bags labeled Ethiopia Colombia Kenya — partially open showing raw pale green beans, specialty coffee green bean sourcing guide, warm warehouse editorial photography, origin diversity visual',
  'processing-methods':                      'triptych concept showing coffee in three processing stages — natural drying on raised beds with red cherries, honey process beans with golden mucilage, washed green beans drying on tile — coffee processing methods comparison, editorial documentary photography',
  'taiwan-coffee-farmer-summer-story':       'elderly Taiwanese coffee farmer couple hand-sorting red coffee cherries in shade of mountain farm, woven baskets of ripe cherries, summer heat haze on green terraced hillside, intimate family farm documentary photography, Taiwan mountain coffee',

  // 咖啡廳 / 城市
  'taipei-specialty-cafes':                  'authentic Taipei specialty coffee shop interior with worn wooden bar counter, barista preparing pour-over behind counter, coffee menu on chalkboard in Chinese characters, warm Edison bulb lighting, intimate real Taiwan cafe atmosphere not overly perfect',
  'taipei-coffee-map-2026':                  'Taipei city specialty coffee street scene, row of modern Japanese-style coffee shop storefronts, afternoon light, coffee shop signs in urban setting, city cafe district guide, warm editorial photography',
  'taipei-coffee-expo-2026-complete-guide':  'crowded Taiwan Specialty Coffee Expo event floor, specialty roasters at branded booths pouring coffee samples, visitors with lanyards, bags of specialty coffee being sold, Taiwan coffee culture exhibition event, large format event hall, documentary editorial style',
  'chiayi-coffee-festival-2026-guide':       'outdoor Chiayi coffee festival in Taiwan mountain town, rows of white tent booths with specialty roasters, families and coffee enthusiasts walking festival grounds, mountain backdrop, friendly community event atmosphere, Taiwan coffee culture festival documentary editorial',

  // 知識 / 歷史
  'arabica-vs-robusta-complete-guide':       'two coffee plant branch specimens side by side — slender Arabica branch with elongated cherries versus robust Robusta with round dense cherries — botanical comparison, specialty coffee botany science editorial, natural daylight, coffee species comparison',
  'specialty-coffee-third-wave-history':     'timeline collage concept with vintage drip coffee percolator, second wave cafe latte to-go cup, and modern third wave pour-over in clear progression, coffee evolution history documentary, warm nostalgic browns and cream tones, specialty coffee history editorial',
  'sustainable-coffee-complete-guide':       'Rainforest Alliance certified specialty coffee bag beside shade-grown coffee farm photograph, fair trade certification seal visible, biodiversity and sustainability concept, green environmental specialty coffee editorial, eco-conscious coffee culture visual',
  'taiwan-specialty-coffee-whitepaper-2026': 'open industry research whitepaper on wooden desk, reading glasses and pen beside printed charts, Taiwan specialty coffee industry statistics graphs visible, professional editorial documentation photography, coffee knowledge and data analysis concept',

  // 賽事
  'wbc-2026-champion-technique-breakdown':   'World Barista Championship 2026 competition stage, champion barista performing choreographed service routine at gleaming espresso machine, presentation glasses of infused water beside espresso flight, championship service etiquette, professional competition documentary photography',
  'wbc-2026-champion-philosophy':            'world barista championship competition stage, focused professional barista in black competition attire operating gleaming espresso machine, dramatic spotlight, championship atmosphere, judges table in background',

  // 生活風格 / 季節
  'morning-coffee-ritual-science':           'early sunrise light streaming through kitchen window, hands holding warm ceramic mug of black pour-over coffee, steam rising into morning air, uncluttered minimal kitchen counter, quiet pre-dawn solo coffee ritual, warm amber morning light, meditative slow morning pace editorial',
  'coffee-reading-afternoon-ritual':         'open book beside V60 pour-over dripper mid-pour with gooseneck kettle, steam rising, soft afternoon window light on wooden desk, reading glasses folded beside book, specialty coffee science and reading afternoon mood',
  'solo-brewing-valentines':                 'single person alone at wooden table slowly pouring gooseneck kettle over V60 pour-over dripper, ceramic mug below catching drip, rainy window in background, quiet solitary afternoon brewing ritual, soft warm side light, meditative peaceful mood',
  'christmas-coffee-gift-guide-2026':        'specialty coffee Christmas gift box contents — small single-origin coffee bags, ceramic pour-over kit, gooseneck kettle — on dark background with pine needles and warm string lights, flat-lay editorial, holiday specialty coffee gift guide photography',
  'new-years-eve-coffee-survival-guide':     'midnight coffee preparation in darkened kitchen, person in formal party attire making late-night espresso, city lights and fireworks through apartment window, clock approaching midnight, energy coffee ritual before New Year countdown, warm kitchen light against dark night',
  'international-coffee-day-10-stories':     'global coffee culture diversity concept, four ceramic cups from different traditions arranged together — Ethiopian jebena clay cup, traditional Turkish small cup, Japanese pour-over glass, Italian demitasse — International Coffee Day world unity editorial',
  'taiwan-coffee-subscription-guide-2026':   'monthly specialty coffee subscription box open on wooden table, three craft bags of single-origin Taiwanese and international coffee, handwritten tasting notes card, kraft paper packaging, specialty coffee mail subscription editorial photography, warm natural light',
  'brazil-natural-process-guide':            'rows of ripe red coffee cherries drying on raised wooden drying beds under bright Brazilian sun in Minas Gerais farm, deep crimson and orange fruit spread evenly on mesh surface, blue sky above, farm worker raking cherries in background, natural process dry fermentation editorial photography, warm golden afternoon light',

  // 土耳其咖啡
  'turkish-coffee-ibrik':                    'ornate copper ibrik cezve simmering on open gas flame in traditional kitchen, thick dark coffee foam rising to brim, brass tray with small porcelain cups and rose loukoum arranged beside it, traditional Turkish coffee ceremony ritual editorial, warm amber light',

  // 年度 / 週報
  '2026-coffee-keywords-annual-review':      'open journal on wooden desk with handwritten coffee industry buzzwords like nano-lot, anaerobic fermentation, cold drop extraction in neat columns, specialty coffee beans scattered on journal pages, annual coffee trend review concept, warm editorial notebook flat-lay',
  'bnotes-2026-annual-coffee-report':        'coffee industry annual report desk scene, cupping score sheets, small glass coffee samples, specialty coffee bags, pen and notebook with handwritten notes, warm editorial light',
  'world-coffee-weekly-vol1':                'specialty coffee editorial newsletter spread on cafe table, reader hands holding printed magazine beside morning pour-over, world coffee news digest first edition cover visible, coffee publications stack, warm editorial light, coffee journalism knowledge culture',
  'taiwan-barista-2026-annual-review':       'Taiwanese champion barista in competition apron standing before gleaming espresso machine at end-of-year review event, specialty coffee equipment displayed on judging table, Taiwan coffee industry annual recognition ceremony, professional barista editorial photography',
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
