/**
 * /api/generate-image  (POST)
 * BNotes 封面圖自動生成 API v1
 * ─────────────────────────────────────────
 * 流程：
 *   1. 依 title/category 組 Unsplash 搜尋關鍵字
 *   2. 透過 Unsplash API 取得高品質圖片
 *   3. 下載並以 base64 寫入 dist/images/ai/{slug}-hero.jpg（GitHub commit）
 *   4. 更新文章 HTML 中的 og:image + Hero 區塊
 * ─────────────────────────────────────────
 * Body: { slug, title, category, [force] }
 * Env:  GITHUB_PAT, UNSPLASH_ACCESS_KEY（optional）
 */

const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const SITE   = 'https://bnotescoffee.com';
const BASE   = 'https://api.github.com';

// 分類 → Unsplash 搜尋詞映射
const CAT_KEYWORDS = {
  'pour-over':  'pour over coffee brewing barista',
  'espresso':   'espresso coffee machine barista',
  'equipment':  'coffee equipment grinder tools',
  'terroir':    'coffee farm origin beans harvest',
  'science':    'coffee science chemistry laboratory',
  'lifestyle':  'coffee lifestyle morning cup',
  '手沖技法':   'pour over coffee brewing barista',
  '義式咖啡':   'espresso coffee machine barista',
  '器材評測':   'coffee equipment grinder tools',
  '產地風土':   'coffee farm origin beans harvest',
  '沖泡科學':   'coffee science chemistry laboratory',
  '咖啡生活':   'coffee lifestyle morning cup',
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

// 安全 base64 encode（支援 UTF-8）
const toB64 = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
};
const b64ToUtf8 = b64 => {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

// 從 ArrayBuffer 轉 base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ── Unsplash 搜尋 ────────────────────────────────────────────────
async function searchUnsplash(query, accessKey) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const r = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Unsplash API error: ${r.status}`);
  const data = await r.json();
  if (!data.results?.length) throw new Error('No results from Unsplash');
  // 取第一張（最相關）
  const photo = data.results[0];
  return {
    url: photo.urls.regular + '&w=1200&h=630&fit=crop&fm=jpg&q=85',
    description: photo.alt_description || query,
    photographer: photo.user.name,
    unsplash_id: photo.id,
  };
}

// ── Fallback：隨機精選咖啡圖（無 Unsplash key 時備用）──────────────
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=630&fit=crop&fm=jpg&q=85',
  'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=1200&h=630&fit=crop&fm=jpg&q=85',
  'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=1200&h=630&fit=crop&fm=jpg&q=85',
  'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200&h=630&fit=crop&fm=jpg&q=85',
  'https://images.unsplash.com/photo-1459755486867-b55449bb39ff?w=1200&h=630&fit=crop&fm=jpg&q=85',
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&h=630&fit=crop&fm=jpg&q=85',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1200&h=630&fit=crop&fm=jpg&q=85',
  'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=1200&h=630&fit=crop&fm=jpg&q=85',
];
function getFallback(slug) {
  let hash = 0;
  for (const c of slug) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
}

export async function onRequestPost({ request, env }) {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': 'https://bnotescoffee.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }});

  const token = env.GITHUB_PAT;
  if (!token) return respond({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

  let body;
  try { body = await request.json(); }
  catch { return respond({ ok: false, error: '無效的 JSON body' }, 400); }

  const { slug, title, category, force = false } = body;
  if (!slug || !/^[a-z0-9-]+$/.test(slug))
    return respond({ ok: false, error: 'slug 格式錯誤' }, 400);

  const localPath   = `/images/ai/${slug}-hero.jpg`;
  const ghImagePath = `dist/images/ai/${slug}-hero.jpg`;

  // ── 1. 檢查圖片是否已存在（非 force 模式）──────────────────────────
  if (!force) {
    const existRes = await fetchGH(`${BASE}/repos/${REPO}/contents/${ghImagePath}?ref=${BRANCH}`, token);
    if (existRes.ok) {
      return respond({ ok: true, image_url: localPath, source: 'existing', message: '圖片已存在，未重新生成' });
    }
  }

  // ── 2. 搜尋圖片（Unsplash 優先，fallback 備用）────────────────────
  let imageUrl, imageSource;
  const catKey = CAT_KEYWORDS[category] || CAT_KEYWORDS['lifestyle'];
  const searchQuery = `${catKey} ${(title || '').split(/[：:，,。 ]/)[0]}`.trim();

  const unsplashKey = env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      const result = await searchUnsplash(searchQuery, unsplashKey);
      imageUrl    = result.url;
      imageSource = `unsplash:${result.unsplash_id}`;
    } catch (e) {
      console.log(`Unsplash search failed: ${e.message}, using fallback`);
      imageUrl    = getFallback(slug);
      imageSource = 'fallback';
    }
  } else {
    imageUrl    = getFallback(slug);
    imageSource = 'fallback';
  }

  // ── 3. 下載圖片並轉為 base64 ─────────────────────────────────────
  let imgBase64;
  try {
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'BNotes-Bot/3.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!imgRes.ok) throw new Error(`圖片下載失敗: ${imgRes.status}`);
    const imgBuf = await imgRes.arrayBuffer();
    imgBase64    = arrayBufferToBase64(imgBuf);
  } catch (e) {
    return respond({ ok: false, error: `圖片下載失敗: ${e.message}` }, 502);
  }

  // ── 4. 取得現有檔案 SHA（更新用）──────────────────────────────────
  let existingSha;
  try {
    const chkRes = await fetchGH(`${BASE}/repos/${REPO}/contents/${ghImagePath}?ref=${BRANCH}`, token);
    if (chkRes.ok) {
      const chkData = await chkRes.json();
      existingSha   = chkData.sha;
    }
  } catch { /* 新檔案，不需要 sha */ }

  // ── 5. 寫入 GitHub ────────────────────────────────────────────────
  const putBody = {
    message: `img: auto-generate cover for ${slug} [img-sync]`,
    content: imgBase64,
    branch:  BRANCH,
    ...(existingSha ? { sha: existingSha } : {}),
  };

  const putRes = await fetchGH(`${BASE}/repos/${REPO}/contents/${ghImagePath}`, token, {
    method: 'PUT',
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    return respond({ ok: false, error: `GitHub 寫入失敗: ${err.message || putRes.status}` }, 502);
  }

  const putData  = await putRes.json();
  const commitSha = putData.commit?.sha?.slice(0, 7) || 'unknown';

  return respond({
    ok: true,
    image_url: localPath,
    source: imageSource,
    commit: commitSha,
    message: `✅ 封面圖已生成並寫入 ${ghImagePath}（${imageSource}，commit ${commitSha}）`,
  });
}
