/**
 * POST /api/delete-article
 *
 * 從前台刪除文章：
 *  1. 將 dist/articles/{slug}.html → dist/_scheduled/{slug}.html
 *  2. 從 dist/index.html 移除對應 <article class="card"> 區塊
 *  3. 從 dist/feed.xml 移除 <item> 區塊
 *  4. 從 dist/sitemap.xml 移除 <url> 區塊
 *  5. 單一 GitHub commit，觸發 Cloudflare Pages 自動重新部署
 *
 * Request JSON: { slug: "article-slug-without-extension" }
 * PAT is read from env.GITHUB_PAT (Cloudflare Pages Secret) — never exposed to browser.
 * Response JSON: { ok: true, commit: "sha", message: "..." } | { ok: false, error: "..." }
 *
 * P2 Security: In-memory rate limiting (10 requests / 10 min / IP)
 * v2 fix: json() helper 加入 Cache-Control + Content-Type headers
 * Note: resets when the Worker isolate is recycled; sufficient for burst protection.
 */

// ── P2: In-memory rate limiter ───────────────────────────────────────────────
// Map: ip → { count: number, resetAt: timestamp }
const _deleteRateMap = new Map();

/**
 * Returns true if the request is within the allowed rate.
 * @param {string} ip        - client IP address
 * @param {number} limit     - max requests per window (default 10)
 * @param {number} windowSec - window duration in seconds (default 600 = 10 min)
 */
function checkDeleteRate(ip, limit = 10, windowSec = 600) {
  const now       = Date.now();
  const windowMs  = windowSec * 1000;
  const entry     = _deleteRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    _deleteRateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ── Constants ────────────────────────────────────────────────────────────────


// ── UTF-8 安全解碼（修復 atob 的 Latin-1 問題）────────────────
function b64ToUtf8(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const BASE   = 'https://api.github.com';

// 允許的前端 Origins（CORS）
const ALLOWED_ORIGINS = [
  'https://bnotescoffee.com',
  'https://bnotes.pages.dev',
  'http://localhost:8788',
  'http://localhost:3000',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('Origin') || '';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  const headers = corsHeaders(origin);

  try {
    // ── P2: Rate limit check ─────────────────────────────────────────────
    const clientIp = request.headers.get('CF-Connecting-IP')
                  || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
                  || 'unknown';
    if (!checkDeleteRate(clientIp, 10, 600)) {
      return json(
        { ok: false, error: '請求過於頻繁，請等待 10 分鐘後再試' },
        429,
        { ...headers, 'Retry-After': '600' },
      );
    }

    const { slug } = await request.json();

    if (!slug) {
      return json({ ok: false, error: '缺少 slug' }, 400, headers);
    }

    // 從 Cloudflare Pages Secret 讀取 PAT
    const token = env.GITHUB_PAT;
    if (!token) {
      return json({ ok: false, error: '伺服器未設定 GITHUB_PAT，請聯絡管理員' }, 503, headers);
    }

    const ghCtrl = new AbortController();
    const ghTimer = setTimeout(() => ghCtrl.abort(), 30000);
    const gh = (path, opts = {}) =>
      fetch(`${BASE}${path}`, {
        ...opts,
        signal: ghCtrl.signal,
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'BNotes-Admin/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(opts.headers || {}),
        },
      });

    // ── 1. 取得所有需要修改的檔案 SHA + 內容 ──────────────────────────────
    const filePaths = {
      article:  `dist/articles/${slug}.html`,
      scheduled:`dist/_scheduled/${slug}.html`,
      index:    'dist/index.html',
      feed:     'dist/feed.xml',
      sitemap:  'dist/sitemap.xml',
    };

    // 取得當前 HEAD tree SHA
    const refRes  = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const refData = await refRes.json();
    if (!refRes.ok) return json({ ok: false, error: `讀取 ref 失敗: ${refData.message}` }, 502, headers);

    const headSha     = refData.object.sha;
    const headCommit  = await (await gh(`/repos/${REPO}/git/commits/${headSha}`)).json();
    const baseTreeSha = headCommit.tree.sha;

    // 平行取得所有檔案
    async function getFile(path) {
      const r = await gh(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
      if (!r.ok) return null;
      const d = await r.json();
      return { sha: d.sha, content: b64ToUtf8(d.content) };
    }

    const [articleFile, indexFile, feedFile, sitemapFile] = await Promise.all([
      getFile(filePaths.article),
      getFile(filePaths.index),
      getFile(filePaths.feed),
      getFile(filePaths.sitemap),
    ]);

    if (!articleFile) {
      return json({ ok: false, error: `找不到文章：${filePaths.article}` }, 404, headers);
    }

    // ── 2. 計算各檔案新內容 ──────────────────────────────────────────────

    // index.html：移除對應 <article class="card"> 區塊
    const indexNew = indexFile
      ? removeCardFromIndex(indexFile.content, slug)
      : null;

    // feed.xml：移除對應 <item> 區塊
    const feedNew = feedFile
      ? removeItemFromFeed(feedFile.content, slug)
      : null;

    // sitemap.xml：移除對應 <url> 區塊
    const sitemapNew = sitemapFile
      ? removeUrlFromSitemap(sitemapFile.content, slug)
      : null;

    // ── 3. 建構 Git tree ──────────────────────────────────────────────────

    // 將文字轉成 base64（UTF-8 安全）
    const toB64 = str => { const b = new TextEncoder().encode(str); let s=''; b.forEach(c=>s+=String.fromCharCode(c)); return btoa(s); };

    // 先把文章內容 blob 建到 _scheduled（同內容，新路徑）
    const articleBlob = await (await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: toB64(articleFile.content), encoding: 'base64' }),
    })).json();

    const treeItems = [
      // 新路徑（_scheduled）：設定新 blob
      { path: filePaths.scheduled, mode: '100644', type: 'blob', sha: articleBlob.sha },
      // 舊路徑（articles）：設為 null 即刪除
      { path: filePaths.article,   mode: '100644', type: 'blob', sha: null },
    ];

    // 更新 index.html（若有變更）
    if (indexNew && indexNew !== indexFile.content) {
      const b = await (await gh(`/repos/${REPO}/git/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: toB64(indexNew), encoding: 'base64' }),
      })).json();
      treeItems.push({ path: filePaths.index, mode: '100644', type: 'blob', sha: b.sha });
    }

    if (feedNew && feedNew !== feedFile.content) {
      const b = await (await gh(`/repos/${REPO}/git/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: toB64(feedNew), encoding: 'base64' }),
      })).json();
      treeItems.push({ path: filePaths.feed, mode: '100644', type: 'blob', sha: b.sha });
    }

    if (sitemapNew && sitemapNew !== sitemapFile.content) {
      const b = await (await gh(`/repos/${REPO}/git/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: toB64(sitemapNew), encoding: 'base64' }),
      })).json();
      treeItems.push({ path: filePaths.sitemap, mode: '100644', type: 'blob', sha: b.sha });
    }

    // 建立新 tree
    const treeRes  = await gh(`/repos/${REPO}/git/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });
    const treeData = await treeRes.json();
    if (!treeRes.ok) return json({ ok: false, error: `建立 tree 失敗: ${treeData.message}` }, 502, headers);

    // ── 4. 建立 commit ────────────────────────────────────────────────────
    const commitRes  = await gh(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `admin: archive article [${slug}]\n\n- 移至 dist/_scheduled/${slug}.html\n- 更新 index.html、feed.xml、sitemap.xml`,
        tree: treeData.sha,
        parents: [headSha],
        author: { name: 'BNotes Admin', email: 'admin@bnotescoffee.com', date: new Date().toISOString() },
      }),
    });
    const commitData = await commitRes.json();
    if (!commitRes.ok) return json({ ok: false, error: `建立 commit 失敗: ${commitData.message}` }, 502, headers);

    // ── 5. 更新 ref（push）────────────────────────────────────────────────
    const pushRes = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commitData.sha, force: false }),
    });
    const pushData = await pushRes.json();
    if (!pushRes.ok) return json({ ok: false, error: `Push 失敗: ${pushData.message}` }, 502, headers);

    return json({
      ok: true,
      commit: commitData.sha.slice(0, 7),
      message: `文章《${slug}》已歸檔，Cloudflare Pages 正在重新部署...`,
    }, 200, headers);

  } catch (err) {
    return json({ ok: false, error: `伺服器錯誤: ${err.message}` }, 500, headers);
  }
}

// ── 工具函式 ────────────────────────────────────────────────────────────────

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache',
      ...headers,
    },
  });
}

/**
 * 從 index.html 移除含 slug 的 <article class="card">...</article> 區塊
 */
function removeCardFromIndex(html, slug) {
  const pattern = new RegExp(
    `\\s*<article class="card">[\\s\\S]*?/articles/${slug}\\.html[\\s\\S]*?</article>`,
    'g'
  );
  return html.replace(pattern, '');
}

/**
 * 從 feed.xml 移除含 slug 的 <item>...</item> 區塊
 */
function removeItemFromFeed(xml, slug) {
  const pattern = new RegExp(
    `\\s*<item>[\\s\\S]*?/articles/${slug}\\.html[\\s\\S]*?</item>`,
    'g'
  );
  return xml.replace(pattern, '');
}

/**
 * 從 sitemap.xml 移除含 slug 的 <url>...</url> 區塊
 */
function removeUrlFromSitemap(xml, slug) {
  const pattern = new RegExp(
    `\\s*<url>[\\s\\S]*?/articles/${slug}\\.html[\\s\\S]*?</url>`,
    'g'
  );
  return xml.replace(pattern, '');
}
