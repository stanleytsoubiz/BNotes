/**
 * POST /api/approve-ai-article
 *
 * 後台管理員審核通過 AI 待審文章：
 *  1. dist/_pending-ai-review/{slug}.html → dist/_scheduled/{slug}.html
 *  2. 更新 frontmatter status: approved，記錄審核時間
 *  3. 同步新增條目到 dist/_scheduled-meta.json
 *  4. 單一 GitHub commit，觸發 Cloudflare Pages 重新部署
 *
 * Request JSON:
 * {
 *   slug: string,        // 文章 slug
 *   publish_date: string // 可選：覆蓋發布日 YYYY-MM-DD
 * }
 *
 * Protected by _middleware.js (requires admin cookie)
 */


// ── UTF-8 安全解碼（修復 atob 的 Latin-1 問題）────────────────
function b64ToUtf8(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const BASE   = 'https://api.github.com';

export async function onRequestPost({ request, env }) {
  const respond = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache',
        'Access-Control-Allow-Origin': 'https://bnotescoffee.com',
      },
    });

  try {
    const body = await request.json().catch(() => null);
    if (!body?.slug) return respond({ ok: false, error: '缺少 slug' }, 400);

    const token = env.GITHUB_PAT;
    if (!token) return respond({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

    const { slug, publish_date } = body;

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return respond({ ok: false, error: 'slug 格式不正確' }, 400);
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

    const toB64 = str => { const b = new TextEncoder().encode(str); let s=''; b.forEach(c=>s+=String.fromCharCode(c)); return btoa(s); };

    // ── 1. 並行讀取：待審文章 + _scheduled-meta.json ──────────────────────
    const srcPath  = `dist/_pending-ai-review/${slug}.html`;
    const dstPath  = `dist/_scheduled/${slug}.html`;
    const metaPath = 'dist/_scheduled-meta.json';

    const [fileRes, metaRes] = await Promise.all([
      gh(`/repos/${REPO}/contents/${srcPath}?ref=${BRANCH}`),
      gh(`/repos/${REPO}/contents/${metaPath}?ref=${BRANCH}`),
    ]);

    if (!fileRes.ok) {
      const e = await fileRes.json().catch(() => ({}));
      return respond({ ok: false, error: `找不到待審文章: ${e.message || srcPath}` }, 404);
    }
    const fileData = await fileRes.json();
    const srcContent = b64ToUtf8(fileData.content);

    // ── 2. 更新 frontmatter：status → approved，記錄審核時間與日期 ─────────
    const now = new Date().toISOString();
    let updatedContent = srcContent;

    updatedContent = updatedContent.replace(/^status:.*$/m, 'status: approved');

    if (/^ai_submitted_at:/m.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /^(ai_submitted_at:.*)/m,
        `$1\napproved_at: "${now}"`
      );
    }

    if (publish_date && /^\d{4}-\d{2}-\d{2}$/.test(publish_date)) {
      updatedContent = updatedContent.replace(/^date:.*$/m, `date: ${publish_date}`);
    }

    // 取得文章的 date 和 title（用於寫入 meta）
    const dateMatch  = updatedContent.match(/^date:\s*(.+)$/m);
    const titleMatch = updatedContent.match(/^title:\s*["'"]?(.+?)["'"]?\s*$/m)
                    || updatedContent.match(/<title>([^<]+)<\/title>/);
    const catMatch   = updatedContent.match(/^category:\s*(.+)$/m);

    const articleDate  = dateMatch  ? dateMatch[1].trim()  : (publish_date || new Date().toISOString().slice(0, 10));
    const articleTitle = titleMatch ? titleMatch[1].trim() : slug;
    const articleCat   = catMatch   ? catMatch[1].trim()   : '';
    const today        = new Date().toISOString().slice(0, 10);
    const isOverdue    = articleDate < today;

    // ── 3. 更新 _scheduled-meta.json（插入/更新條目）──────────────────────
    let metaNewContent = null;
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      try {
        const metaJson = JSON.parse(b64ToUtf8(metaData.content));
        // _scheduled-meta.json 是 {slug: {...}} object
        const newEntry = {
          title: articleTitle,
          date: articleDate,
          category: articleCat,
          description: '',
          cover_image: '',
        };
        metaJson[slug] = newEntry;  // 若存在則更新，不存在則新增
        metaNewContent = JSON.stringify(metaJson, null, 2);
      } catch {
        metaNewContent = null;
      }
    }

    // ── 4. GitHub API：移動檔案（建立新路徑 + 刪除舊路徑）+ 更新 meta ──────
    const refRes     = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const refData    = await refRes.json();
    if (!refRes.ok) return respond({ ok: false, error: `Git ref 失敗: ${refData.message}` }, 502);

    const headSha    = refData.object.sha;
    const headCommit = await (await gh(`/repos/${REPO}/git/commits/${headSha}`)).json();
    const baseTreeSha = headCommit.tree.sha;

    // 建立新路徑 blob
    const blobRes = await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: toB64(updatedContent), encoding: 'base64' }),
    });
    const blobData = await blobRes.json();
    if (!blobRes.ok) return respond({ ok: false, error: `建立 blob 失敗: ${blobData.message}` }, 502);

    const treeItems = [
      { path: dstPath, mode: '100644', type: 'blob', sha: blobData.sha },
      { path: srcPath, mode: '100644', type: 'blob', sha: null }, // 刪除來源
    ];

    // 同步更新 meta
    if (metaNewContent !== null) {
      const metaBlobRes  = await gh(`/repos/${REPO}/git/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: toB64(metaNewContent), encoding: 'base64' }),
      });
      const metaBlobData = await metaBlobRes.json();
      if (metaBlobRes.ok) {
        treeItems.push({ path: metaPath, mode: '100644', type: 'blob', sha: metaBlobData.sha });
      }
    }

    const treeRes = await gh(`/repos/${REPO}/git/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });
    const treeData = await treeRes.json();
    if (!treeRes.ok) return respond({ ok: false, error: `建立 tree 失敗: ${treeData.message}` }, 502);

    const commitRes = await gh(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `admin: approve AI article [${slug}]\n\n- 移至 dist/_scheduled/${slug}.html\n- status: pending-review → approved\n- 審核時間: ${now}\n- 同步更新 _scheduled-meta.json`,
        tree: treeData.sha,
        parents: [headSha],
        author: {
          name: 'BNotes Admin',
          email: 'admin@bnotescoffee.com',
          date: now,
        },
      }),
    });
    const commitData = await commitRes.json();
    if (!commitRes.ok) return respond({ ok: false, error: `建立 commit 失敗: ${commitData.message}` }, 502);

    const pushRes = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commitData.sha, force: false }),
    });
    const pushData = await pushRes.json();
    if (!pushRes.ok) return respond({ ok: false, error: `Push 失敗: ${pushData.message}` }, 502);

    return respond({
      ok: true,
      commit: commitData.sha.slice(0, 7),
      slug,
      message: `✅ 文章《${slug}》審核通過，已移入排程佇列並同步更新 meta`,
    });

  } catch (err) {
    return respond({ ok: false, error: `伺服器錯誤: ${err.message}` }, 500);
  }
}
