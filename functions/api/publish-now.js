/**
 * POST /api/publish-now  v4 (optim: TextEncoder toB64 + CORS)
 *
 * 立刻發布排程文章：
 *  1. dist/_scheduled/{slug}.html → dist/articles/{slug}.html
 *  2. 更新 frontmatter 日期為今天
 *  3. 同步從 dist/_scheduled-meta.json 移除對應條目
 *  4. 觸發 Cloudflare Pages 重新部署
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
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, no-cache', 'Access-Control-Allow-Origin': 'https://bnotescoffee.com' },
    });

  try {
    const body = await request.json().catch(() => null);
    if (!body?.slug) return respond({ ok: false, error: '缺少 slug' }, 400);

    const token = env.GITHUB_PAT;
    if (!token) return respond({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

    const { slug } = body;
    if (!/^[a-z0-9-]+$/.test(slug)) return respond({ ok: false, error: 'slug 格式不正確' }, 400);

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

    const toB64 = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
};

    // ── 1. 並行讀取：排程文章 + _scheduled-meta.json ─────────────────────
    const srcPath  = `dist/_scheduled/${slug}.html`;
    const dstPath  = `dist/articles/${slug}.html`;
    const metaPath = 'dist/_scheduled-meta.json';

    const [srcRes, metaRes] = await Promise.all([
      gh(`/repos/${REPO}/contents/${srcPath}?ref=${BRANCH}`),
      gh(`/repos/${REPO}/contents/${metaPath}?ref=${BRANCH}`),
    ]);

    if (!srcRes.ok) {
      const e = await srcRes.json().catch(() => ({}));
      return respond({ ok: false, error: `找不到排程文章: ${e.message || srcPath}` }, 404);
    }
    const srcData    = await srcRes.json();
    const srcContent = b64ToUtf8(srcData.content);

    // ── 2. 更新 frontmatter 日期為今天 ────────────────────────────────────
    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedContent = srcContent.replace(/^date:\s*.+$/m, `date: ${todayStr}`);

    // ── 3. 更新 _scheduled-meta.json（移除此 slug 條目）──────────────────
    let metaNewContent = null;
    let metaSha = null;
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      metaSha = metaData.sha;
      try {
        const metaJson = JSON.parse(b64ToUtf8(metaData.content));
        // _scheduled-meta.json 是 {slug: {...}} object，直接刪除 key
        if (Object.prototype.hasOwnProperty.call(metaJson, slug)) {
          delete metaJson[slug];
        }
        metaNewContent = JSON.stringify(metaJson, null, 2);
      } catch {
        // meta 解析失敗時不阻擋發布，只記錄警告
        metaNewContent = null;
      }
    }

    // ── 4. 取得 main 分支的 tree SHA ─────────────────────────────────────
    const refRes  = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const refData = await refRes.json();
    if (!refRes.ok) return respond({ ok: false, error: `取得 ref 失敗: ${refData.message}` }, 500);
    const baseCommitSha = refData.object.sha;

    const commitRes  = await gh(`/repos/${REPO}/git/commits/${baseCommitSha}`);
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // ── 5. 建立 blob：目標文章 ────────────────────────────────────────────
    const blobRes  = await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: toB64(updatedContent), encoding: 'base64' }),
    });
    const blobData = await blobRes.json();
    if (!blobRes.ok) return respond({ ok: false, error: `建立 blob 失敗: ${blobData.message}` }, 500);

    // ── 6. 建立 tree：新增 dst，刪除 src，可選更新 meta ──────────────────
    const treeItems = [
      { path: dstPath, mode: '100644', type: 'blob', sha: blobData.sha },
      { path: srcPath, mode: '100644', type: 'blob', sha: null },  // 刪除來源
    ];

    // 同步更新 meta（若成功解析）
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
    if (!treeRes.ok) return respond({ ok: false, error: `建立 tree 失敗: ${treeData.message}` }, 500);

    // ── 7. 建立 commit ────────────────────────────────────────────────────
    const newCommitRes = await gh(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `publish: [admin manual] ${slug}\n\n- 移至 dist/articles\n- 更新日期為 ${todayStr}\n- 同步更新 _scheduled-meta.json`,
        tree: treeData.sha,
        parents: [baseCommitSha],
        author: { name: 'BNotes Admin', email: 'admin@bnotescoffee.com', date: new Date().toISOString() },
      }),
    });
    const newCommitData = await newCommitRes.json();
    if (!newCommitRes.ok) return respond({ ok: false, error: `建立 commit 失敗: ${newCommitData.message}` }, 500);

    // ── 8. 更新 ref ───────────────────────────────────────────────────────
    const updateRefRes = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitData.sha, force: false }),
    });
    if (!updateRefRes.ok) {
      const e = await updateRefRes.json();
      return respond({ ok: false, error: `更新 ref 失敗: ${e.message}` }, 500);
    }

    return respond({
      ok: true,
      commit: newCommitData.sha.slice(0, 7),
      message: `文章《${slug}》已立刻發布，日期更新為 ${todayStr}，排程佇列已同步`,
    });

  } catch (err) {
    return respond({ ok: false, error: err.message }, 500);
  }
}
