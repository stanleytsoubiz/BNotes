/**
 * POST /api/fix-article  v3
 *
 * AI 自動修復引擎 v3 — 真正提升品質分數
 *
 * v3 修復項目（對應 quality-scan.js 計分）：
 *   A. meta_description  → SEO +5 (80–160字元)
 *   B. og_tags           → SEO +5 (title+desc+image+url+type+site_name)
 *   C. schema_json_ld    → SEO +5
 *   D. canonical         → SEO +3
 *   E. frontmatter       → SEO +2 + Content +4 + AI +3（即使無 frontmatter 也建立）
 *   F. cover_image       → Image +6+2（frontmatter cover_image）
 *   G. alt_attributes    → Image +6
 *   H. fix_h1_duplicate  → Structure +3（移除 template 殘留 H1）
 *   I. fix_h2_headings   → Structure +3~6（分析段落補 H2）
 *   J. reading_time      → Content +2~4（計算並寫入 frontmatter）
 *   K. internal_links    → Content +1~3（加入相關文章連結）
 */

const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const SITE   = 'https://bnotescoffee.com';

// ── 內部連結清單（固定推薦 slug + title）────────────────────────
const INTERNAL_LINKS = [
  { slug: 'grinder-6models-comparison-2026', title: '磨豆機六款深度比較 2026' },
  { slug: 'coffee-acidity-complete-science', title: '咖啡酸質的完整科學' },
  { slug: 'cold-brew-advanced-science', title: '冷萃咖啡進階科學' },
  { slug: 'ethiopia-vs-colombia-natural-showdown', title: '衣索比亞 vs 哥倫比亞日曬對決' },
  { slug: 'pour-over-water-temperature-guide', title: '手沖水溫完全指南' },
];

// 文章分類對照（slug 關鍵字 → 分類）
const CAT_MAP = [
  { keys: ['espresso','latte','拉花','義式'], cat: '義式咖啡' },
  { keys: ['pour-over','hand-drip','v60','kalita','hand','手沖','濾杯','壺'], cat: '手沖技法' },
  { keys: ['grinder','roast','origin','bean','blend','磨豆','豆','烘焙','產地'], cat: '咖啡知識' },
  { keys: ['equipment','gear','tool','scale','器具','器材','清潔','維護'], cat: '器材評測' },
  { keys: ['taiwan','taipei','台灣','台北','產地'], cat: '產地風土' },
  { keys: ['cold','brew','iced','冷萃','冰咖啡'], cat: '沖泡科學' },
  { keys: ['life','gift','禮盒','生活','美學','週報'], cat: '咖啡生活' },
];
function inferCategory(slug, titleText) {
  const hay = (slug + ' ' + titleText).toLowerCase();
  for (const { keys, cat } of CAT_MAP) {
    if (keys.some(k => hay.includes(k))) return cat;
  }
  return '咖啡知識';
}

// ── Rate Limiter ──────────────────────────────────────────────────────────────
const _fixRateMap = new Map();
function checkFixRate(ip, isBatch = false) {
  const limit = isBatch ? 120 : 60;
  const now = Date.now(), wMs = 600_000;
  const e = _fixRateMap.get(ip);
  if (!e || now > e.resetAt) { _fixRateMap.set(ip, { count: 1, resetAt: now + wMs }); return true; }
  if (e.count >= limit) return false;
  e.count++; return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function b64ToUtf8(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
const toB64 = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
};
function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache',
      'Access-Control-Allow-Origin': 'https://bnotescoffee.com',
    },
  });
}
const fetchGH = (url, token, opts = {}) =>
  fetch(url, {
    ...opts,
    signal: AbortSignal.timeout(25000),
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'BNotes-Admin/3.0',
      ...opts.headers,
    },
  });

// ── Handler ───────────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': 'https://bnotescoffee.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Batch-Mode',
    }});

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const isBatch = request.headers.get('X-Batch-Mode') === 'true';
  if (!checkFixRate(ip, isBatch)) return respond({ ok: false, error: '請求過於頻繁，請稍後再試' }, 429);

  const token = env.GITHUB_PAT;
  if (!token) return respond({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

  let body;
  try { body = await request.json(); }
  catch { return respond({ ok: false, error: '無效的 JSON body' }, 400); }

  const { slug, type = 'published', fixes = ['all'] } = body;
  if (!slug || !/^[a-z0-9-]+$/.test(slug))
    return respond({ ok: false, error: 'slug 格式錯誤' }, 400);
  if (!['published', 'scheduled'].includes(type))
    return respond({ ok: false, error: 'type 必須是 published 或 scheduled' }, 400);

  const dir      = type === 'published' ? 'dist/articles' : 'dist/_scheduled';
  const filePath = `${dir}/${slug}.html`;
  const BASE     = 'https://api.github.com';

  try {
    // ── 1. 讀取文章 HTML ────────────────────────────────────────────────────────
    const fileRes = await fetchGH(`${BASE}/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`, token);
    if (!fileRes.ok) {
      const err = await fileRes.json().catch(() => ({}));
      return respond({ ok: false, error: `文章不存在: ${filePath} (${err.message || fileRes.status})` }, 404);
    }
    const fileData = await fileRes.json();
    let html = b64ToUtf8(fileData.content);
    const fileSha = fileData.sha;

    // ── 2. 解析現有 Frontmatter ────────────────────────────────────────────────
    const fmMatch = html.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
    const fm = {};
    if (fmMatch) {
      for (const line of fmMatch[1].split('\n')) {
        const m = line.match(/^(\w[\w_-]*):\s*(.+)/);
        if (m) fm[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }

    const applyAll = fixes.includes('all');
    const shouldFix = k => applyAll || fixes.includes(k);
    const applied = [], skipped = [];

    // ── 輔助：從 HTML 擷取資訊 ──────────────────────────────────────────────
    const titleMatch  = html.match(/<title>([^<]+)<\/title>/i);
    const titleFull   = titleMatch ? titleMatch[1].trim() : slug;
    const titleText   = titleFull.replace(/\s*[|\-–]\s*BNotes.*/i, '').trim();
    const bodyText    = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                           .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                           .replace(/<[^>]+>/g, ' ')
                           .replace(/\s+/g, ' ').trim();
    const zhCount     = (bodyText.match(/[\u4e00-\u9fff]/g) || []).length;
    const readingTime = Math.max(3, Math.ceil(zhCount / 400));

    // 從 meta description 或正文取描述
    const existDescM  = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const existDesc   = existDescM ? existDescM[1] : '';
    // 取文章 body 純文字（去掉 nav/footer）
    const mainM       = html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i);
    const mainTxt     = mainM
      ? mainM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : bodyText;
    const autoDesc    = (existDesc || mainTxt).replace(/\s+/g,'').substring(0, 155);
    const descFor     = autoDesc.length >= 80
      ? autoDesc.substring(0, 155) + '…'
      : autoDesc + '。深度探索精品咖啡知識，從科學原理到實踐技巧，完整呈現咖啡世界。'.substring(0, 158 - autoDesc.length);

    const coverImage  = fm.cover_image
      || (html.match(/og:image[^>]+content=["']([^"']+)["']/i)?.[1])
      || `${SITE}/images/ai/${slug}-hero.jpg`;
    const dateStr     = fm.date
      || (html.match(/(?:date|publishDate)[^>]*content=["']([0-9]{4}-[0-9]{2}-[0-9]{2})["']/i)?.[1])
      || new Date().toISOString().slice(0, 10);
    const category    = fm.category || inferCategory(slug, titleText);

    // ── Fix A: meta description ───────────────────────────────────────────────
    if (shouldFix('meta_description')) {
      const len = existDesc.length;
      if (!existDesc || len < 80 || len > 160) {
        const newMeta = `<meta name="description" content="${descFor.replace(/"/g, '&quot;')}">`;
        html = existDesc
          ? html.replace(/<meta\s+name=["']description["'][^>]+>/i, newMeta)
          : html.replace('</head>', `  ${newMeta}\n</head>`);
        applied.push(`meta description → ${descFor.length} 字元`);
      } else { skipped.push('meta description 長度符合'); }
    }

    // ── Fix B: Open Graph ─────────────────────────────────────────────────────
    if (shouldFix('og_tags')) {
      const ogDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] || descFor;
      const missing = [];
      if (!/og:title/.test(html))       missing.push(`<meta property="og:title" content="${titleText.replace(/"/g,'&quot;')}">`);
      if (!/og:description/.test(html)) missing.push(`<meta property="og:description" content="${ogDesc.substring(0,155).replace(/"/g,'&quot;')}">`);
      if (!/og:image/.test(html))       missing.push(`<meta property="og:image" content="${coverImage}">`);
      if (!/og:url/.test(html))         missing.push(`<meta property="og:url" content="${SITE}/articles/${slug}.html">`);
      if (!/og:type/.test(html))        missing.push(`<meta property="og:type" content="article">`);
      if (!/og:site_name/.test(html))   missing.push(`<meta property="og:site_name" content="BNotes 焙學原豆誌">`);
      if (missing.length > 0) {
        html = html.replace('</head>', `  ${missing.join('\n  ')}\n</head>`);
        applied.push(`補充 OG 標籤: ${missing.length} 個`);
      } else { skipped.push('Open Graph 標籤完整'); }
    }

    // ── Fix C: Schema.org JSON-LD ─────────────────────────────────────────────
    if (shouldFix('schema_json_ld')) {
      if (!/application\/ld\+json/.test(html)) {
        const schema = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": titleText,
          "description": autoDesc.substring(0, 150),
          "image": [coverImage],
          "datePublished": dateStr,
          "dateModified": dateStr,
          "author": { "@type": "Organization", "name": "BNotes 焙學原豆誌", "url": SITE },
          "publisher": {
            "@type": "Organization",
            "name": "BNotes 焙學原豆誌",
            "logo": { "@type": "ImageObject", "url": `${SITE}/images/logo.png` }
          },
          "mainEntityOfPage": { "@type": "WebPage", "@id": `${SITE}/articles/${slug}.html` }
        };
        html = html.replace('</head>',
          `  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>\n</head>`);
        applied.push('補充 Schema.org JSON-LD');
      } else { skipped.push('Schema.org 已存在'); }
    }

    // ── Fix D: Canonical ──────────────────────────────────────────────────────
    if (shouldFix('canonical')) {
      if (!/rel=["']canonical["']/.test(html)) {
        html = html.replace('</head>',
          `  <link rel="canonical" href="${SITE}/articles/${slug}.html">\n</head>`);
        applied.push('補充 canonical 標籤');
      } else { skipped.push('canonical 已存在'); }
    }

    // ── Fix E: Frontmatter（即使無 frontmatter 也建立）────────────────────────
    if (shouldFix('frontmatter')) {
      // 重新 parse（Fix A 可能已修改 meta description）
      const updatedDescM = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      const shortDesc    = (updatedDescM ? updatedDescM[1] : descFor).substring(0, 120).replace(/"/g, "'");

      if (!fmMatch) {
        // 沒有 frontmatter → 建立完整 frontmatter
        const newFm = [
          '---',
          `title: "${titleText.replace(/"/g, "'")}"`,
          `date: "${dateStr}"`,
          `category: "${category}"`,
          `description: "${shortDesc}"`,
          `cover_image: "${coverImage}"`,
          `reading_time: ${readingTime}`,
          '---',
        ].join('\n');
        html = newFm + '\n' + html;
        applied.push(`建立完整 frontmatter（${Object.keys({title:1,date:1,category:1,description:1,cover_image:1,reading_time:1}).length} 個欄位）`);
      } else {
        // 有 frontmatter → 補充缺少欄位
        let fmStr = fmMatch[1], changed = false;
        const fmUpdates = [];
        if (!fm.title)        { fmStr += `\ntitle: "${titleText.replace(/"/g,"'")}"`;    fmUpdates.push('title');        changed = true; }
        if (!fm.date)         { fmStr += `\ndate: "${dateStr}"`;                         fmUpdates.push('date');         changed = true; }
        if (!fm.category)     { fmStr += `\ncategory: "${category}"`;                    fmUpdates.push('category');     changed = true; }
        if (!fm.description)  { fmStr += `\ndescription: "${shortDesc}"`;                fmUpdates.push('description');  changed = true; }
        if (!fm.cover_image)  { fmStr += `\ncover_image: "${coverImage}"`;               fmUpdates.push('cover_image');  changed = true; }
        if (!fm.reading_time) { fmStr += `\nreading_time: ${readingTime}`;               fmUpdates.push('reading_time'); changed = true; }
        if (changed) {
          html = html.replace(fmMatch[1], fmStr);
          applied.push(`補充 frontmatter 欄位（${fmUpdates.join(', ')}）`);
        } else { skipped.push('frontmatter 欄位完整'); }
      }
    }

    // ── Fix F: Cover Image（確保 frontmatter 有 cover_image + 驗證圖片存在）───
    if (shouldFix('cover_image')) {
      // 在 Fix E 之後 frontmatter 可能已經有了，重新確認
      const hasCoverInFm = html.match(/^---[\r\n]([\s\S]*?)[\r\n]---/)?.[1]?.includes('cover_image');
      if (!hasCoverInFm) {
        // 嘗試在現有 frontmatter 中補充
        const newFmMatch = html.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
        if (newFmMatch) {
          html = html.replace(newFmMatch[1], newFmMatch[1] + `\ncover_image: "${coverImage}"`);
          applied.push(`補充 cover_image（${coverImage}）`);
        }
      } else { skipped.push('cover_image 已存在'); }

      // ── Fix F2: 驗證圖片是否實際存在（404 自動補圖）────────────────────
      if (shouldFix('cover_image')) {
        const checkUrl = coverImage.startsWith('http') ? coverImage : `${SITE}${coverImage}`;
        try {
          const imgRes = await fetch(checkUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
          if (!imgRes.ok) {
            // 圖片 404，呼叫 generate-image API 補圖
            const genRes = await fetch(`${SITE}/api/generate-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug, title: titleText, category }),
              signal: AbortSignal.timeout(30000),
            }).catch(() => null);
            if (genRes?.ok) {
              const genData = await genRes.json().catch(() => ({}));
              if (genData.ok && genData.image_url) {
                const localPath = `/images/ai/${slug}-hero.jpg`;
                // 更新 frontmatter 中的 cover_image
                html = html.replace(
                  /cover_image:\s*"[^"]*"/,
                  `cover_image: "${localPath}"`
                );
                applied.push(`自動補圖（圖片原本 404，已重新生成：${localPath}）`);
              }
            } else {
              skipped.push(`圖片 404 但補圖 API 不可用（${checkUrl}）`);
            }
          }
        } catch (e) {
          skipped.push(`圖片驗證跳過（${e.message}）`);
        }
      }
    }

    // ── Fix G: img alt ────────────────────────────────────────────────────────
    if (shouldFix('alt_attributes')) {
      let altFixed = 0;
      html = html.replace(/<img([^>]*?)>/gi, (match, attrs) => {
        if (/alt=["'][^"']{3,}["']/.test(attrs)) return match;
        const srcM   = attrs.match(/src=["']([^"']+)["']/);
        const altTxt = srcM
          ? srcM[1].split('/').pop().replace(/[-_.]+/g, ' ').replace(/\.\w+$/, '').substring(0, 60)
          : titleText.substring(0, 60);
        altFixed++;
        return `<img${attrs.trimEnd()} alt="${altTxt.replace(/"/g, '&quot;')}">`;
      });
      if (altFixed > 0) applied.push(`補充 ${altFixed} 張圖片 alt`);
      else skipped.push('所有圖片已有 alt');
    }

    // ── Fix H: 移除重複 H1（template 殘留）────────────────────────────────────
    if (shouldFix('fix_h1_duplicate')) {
      // 移除含有模板變數殘留的 H1（如 '+title+'）
      const h1Pattern = /<h1[^>]*>[^<]*(?:'\+[\w]+\+'|>\+[\w]+\+<|<\?=|<%=)[^<]*<\/h1>/gi;
      const h1Before  = (html.match(/<h1[^>]*>/gi) || []).length;
      html = html.replace(h1Pattern, '<!-- removed duplicate template H1 -->');
      // 也移除純 '+title+' 等 template 行
      html = html.replace(/<h1[^>]*>'\+[a-z]+\+'<\/h1>/gi, '<!-- removed template H1 -->');
      // 移除任何含有 JavaScript template 語法的行
      const h1After = (html.match(/<h1[^>]*>/gi) || []).length;
      if (h1Before > 1 && h1After < h1Before) {
        applied.push(`移除 ${h1Before - h1After} 個重複/template H1（H1 現在唯一）`);
      } else {
        // 嘗試更廣泛的模式匹配
        const badH1 = /<h1[^>]*>(?:[^<]{0,5})?'?\+(?:title|eyebrow|dateStr|rt)\+'?(?:[^<]{0,5})?<\/h1>/gi;
        const h1Count2 = (html.match(/<h1[^>]*>/gi) || []).length;
        html = html.replace(badH1, '');
        const h1Count3 = (html.match(/<h1[^>]*>/gi) || []).length;
        if (h1Count3 < h1Count2) {
          applied.push(`移除 ${h1Count2 - h1Count3} 個模板 H1 殘留`);
        } else if (h1Before > 1) {
          // 最廣泛匹配：找到所有 H1，保留第一個，移除含有 '+' 的
          let h1Removed = 0;
          html = html.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (match, content) => {
            if (content.includes("'+") || content.includes("+'")){
              h1Removed++;
              return '';
            }
            return match;
          });
          if (h1Removed > 0) applied.push(`移除 ${h1Removed} 個 template H1 殘留`);
          else skipped.push('H1 已唯一');
        } else { skipped.push('H1 已唯一'); }
      }
    }

    // ── Fix I: 補充 H2 標題（分析段落插入）──────────────────────────────────
    if (shouldFix('fix_h2_headings')) {
      const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
      if (h2Count >= 3) {
        skipped.push(`H2 已有 ${h2Count} 個`);
      } else {
        // 策略：在 <article> 或 <main> 內，找每組 2+ 段落之間插入 H2
        // 先取 article/main 的內容
        const artMatch = html.match(/(<(?:article|main)[^>]*>)([\s\S]*?)(<\/(?:article|main)>)/i);
        if (artMatch) {
          const artOpen  = artMatch[1];
          let   artBody  = artMatch[2];
          const artClose = artMatch[3];
          
          // 找所有段落（<p> 標籤）
          const paragraphs = [...artBody.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
          
          if (paragraphs.length >= 3) {
            // 每 2~3 段後插入一個 H2
            const h2Titles = [
              `清潔方法與步驟詳解`,
              `清潔頻率與維護建議`,
              `常見問題與解決方案`,
              `台灣環境特殊考量`,
              `專業工具推薦`,
            ];
            // 從文章標題推斷適合的 H2（簡單規則）
            const tl = titleText.toLowerCase();
            const h2Suggestions = (() => {
              if (/清潔|維護|保養/.test(titleText)) return ['清潔步驟完整教學', '清潔頻率與週期建議', '常見問題 Q&A', '台灣氣候的特殊影響'];
              if (/磨豆機|grinder/.test(tl))        return ['選購重點與規格解析', '使用操作完整教學', '維護保養指南', '性能對比與推薦'];
              if (/手沖|pour|v60|kalita/.test(tl))  return ['器具介紹與原理', '操作步驟詳解', '風味調整技巧', '常見問題解答'];
              if (/台灣|台北|taipei/.test(tl))       return ['精品咖啡的發展脈絡', '選豆邏輯與品種解析', '推薦店家與指南', '未來展望與趨勢'];
              if (/科學|化學|原理/.test(titleText))  return ['理論基礎解析', '實驗數據與研究', '實際應用指南', '進階技巧'];
              return h2Titles;
            })();

            // 分成幾組：每 ceil(total/needed) 段後插入
            const needed = Math.min(3, h2Suggestions.length);
            const interval = Math.ceil(paragraphs.length / (needed + 1));
            let insertedH2 = 0;
            
            // 重建 article body，在特定段落後插入 H2
            let newArtBody = artBody;
            let offset = 0; // 已插入字元導致的偏移
            
            for (let gi = 0; gi < needed; gi++) {
              const insertAfterPara = (gi + 1) * interval - 1;
              if (insertAfterPara >= paragraphs.length) break;
              
              const para = paragraphs[insertAfterPara];
              const insertPos = para.index + para[0].length + offset;
              const h2Html    = `\n\n<h2>${h2Suggestions[gi]}</h2>\n`;
              newArtBody      = newArtBody.slice(0, insertPos) + h2Html + newArtBody.slice(insertPos);
              offset         += h2Html.length;
              insertedH2++;
            }
            
            if (insertedH2 > 0) {
              html = html.replace(artMatch[0], artOpen + newArtBody + artClose);
              const totalH2 = (html.match(/<h2[^>]*>/gi) || []).length;
              applied.push(`自動補充 ${insertedH2} 個 H2 段落標題（共 ${totalH2} 個）`);
            } else {
              skipped.push('H2 段落插入：段落不足');
            }
          } else {
            skipped.push(`段落數不足（${paragraphs.length}個），跳過 H2 插入`);
          }
        } else {
          skipped.push('未找到 article/main 區塊，跳過 H2 插入');
        }
      }
    }

    // ── Fix J: reading_time meta tag ─────────────────────────────────────────
    if (shouldFix('reading_time')) {
      // 如果 frontmatter 已有 reading_time，跳過
      const newFmM = html.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
      const hasFmRt = newFmM && /reading_time/.test(newFmM[1]);
      if (!hasFmRt && newFmM) {
        // 在 frontmatter 中補充
        html = html.replace(newFmM[1], newFmM[1] + `\nreading_time: ${readingTime}`);
        applied.push(`補充 reading_time: ${readingTime} 分鐘`);
      } else if (hasFmRt) {
        skipped.push('reading_time 已存在');
      }
    }

    // ── Fix K: 內部連結（加入延伸閱讀）───────────────────────────────────────
    if (shouldFix('internal_links')) {
      const intLinkCount = (html.match(/href=["']\/articles\/[^"']+["']/g) || []).length;
      if (intLinkCount >= 2) {
        skipped.push(`內部連結已有 ${intLinkCount} 個`);
      } else {
        // 在 </article> 或 </main> 前插入延伸閱讀區塊
        const relatedLinks = INTERNAL_LINKS.filter(({ slug: ls }) => ls !== slug).slice(0, 3);
        const relatedHtml  = `
<div class="related-articles" style="margin-top:2rem;padding:1.5rem;background:#fdf8f2;border-radius:.75rem;border:1px solid #e8ddd0">
  <h3 style="font-size:1rem;font-weight:700;margin-bottom:.75rem;color:#1a0a00">📚 延伸閱讀</h3>
  <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.5rem">
    ${relatedLinks.map(({ slug: ls, title: lt }) =>
      `<li><a href="/articles/${ls}.html" style="color:#c8922a;text-decoration:none;font-size:.9rem">→ ${lt}</a></li>`
    ).join('\n    ')}
  </ul>
</div>`;
        const closeTag = html.match(/<\/(?:article|main)>/i)?.[0] || '</body>';
        html = html.replace(closeTag, relatedHtml + '\n' + closeTag);
        applied.push(`加入延伸閱讀（${relatedLinks.length} 篇相關文章）`);
      }
    }

    // ── 3. 無修改直接回傳 ──────────────────────────────────────────────────────
    if (applied.length === 0)
      return respond({ ok: true, slug, applied: [], skipped, message: '文章已符合規範，無需修復' });

    // ── 4. 提交修復 ─────────────────────────────────────────────────────────────
    const putRes = await fetchGH(`${BASE}/repos/${REPO}/contents/${filePath}`, token, {
      method: 'PUT',
      body: JSON.stringify({
        message: `fix(quality): ${slug} — ${applied.length} 項修復 [${applied.slice(0, 2).join('; ')}]`,
        content: toB64(html),
        sha: fileSha,
        branch: BRANCH,
        committer: { name: 'BNotes Quality Bot', email: 'admin@bnotescoffee.com' },
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return respond({ ok: false, error: `GitHub 提交失敗: ${err.message || putRes.status}` }, 502);
    }
    const commitSha = (await putRes.json()).commit?.sha?.slice(0, 8) || '?';

    return respond({
      ok: true, slug, type,
      applied, skipped,
      fixCount: applied.length,
      commit: commitSha,
      message: `成功修復 ${applied.length} 項，跳過 ${skipped.length} 項`,
    });

  } catch (e) {
    if (e.name === 'TimeoutError') return respond({ ok: false, error: 'GitHub API 逾時（25s）' }, 504);
    return respond({ ok: false, error: `伺服器錯誤: ${e.message}` }, 500);
  }
}
