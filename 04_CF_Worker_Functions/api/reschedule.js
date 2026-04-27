/**
 * POST /api/reschedule  v4 (optim: TextEncoder toB64 + CORS)
 *
 * 重新安排排程文章的發布日期：
 *  1. 更新 dist/_scheduled/{slug}.html 的 frontmatter date 欄位
 *  2. 同步更新 dist/_scheduled-meta.json 中對應條目的 date 欄位
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
    if (!body?.slug || !body?.new_date) return respond({ ok: false, error: '缺少 slug 或 new_date' }, 400);

    const token = env.GITHUB_PAT;
    if (!token) return respond({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

    const { slug, new_date } = body;

    if (!/^[a-z0-9-]+$/.test(slug)) return respond({ ok: false, error: 'slug 格式不正確' }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(new_date)) return respond({ ok: false, error: 'new_date 格式須為 YYYY-MM-DD' }, 400);

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
    const filePath = `dist/_scheduled/${slug}.html`;
    const metaPath = 'dist/_scheduled-meta.json';

    const [fileRes, metaRes] = await Promise.all([
      gh(`/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`),
      gh(`/repos/${REPO}/contents/${metaPath}?ref=${BRANCH}`),
    ]);

    if (!fileRes.ok) {
      const e = await fileRes.json().catch(() => ({}));
      return respond({ ok: false, error: `找不到排程文章: ${e.message || filePath}` }, 404);
    }
    const fileData   = await fileRes.json();
    const oldContent = b64ToUtf8(fileData.content);
    const fileSha    = fileData.sha;

    // ── 2. 替換 frontmatter 中的 date ─────────────────────────────────────
    const newContent = oldContent.replace(/^date:\s*.+$/m, `date: ${new_date}`);

    if (!/^date:\s*/m.test(oldContent)) {
      return respond({ ok: false, error: '日期替換失敗（frontmatter 中找不到 date 欄位）' }, 400);
    }
    if (newContent === oldContent) {
      return respond({ ok: true, message: '日期未變更（已是 ' + new_date + '）', commit: 'no-change' });
    }

    // ── 3. 解析並更新 _scheduled-meta.json ───────────────────────────────
    let metaNewContent = null;
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      try {
        const metaJson = JSON.parse(b64ToUtf8(metaData.content));
        // _scheduled-meta.json 是 {slug: {...}} object，直接更新對應 key
        if (Object.prototype.hasOwnProperty.call(metaJson, slug)) {
          metaJson[slug] = { ...metaJson[slug], date: new_date };
        }
        metaNewContent = JSON.stringify(metaJson, null, 2);
      } catch {
        metaNewContent = null; // 解析失敗不阻擋主操作
      }
    }

    // ── 4. 計算是否 overdue（供 meta 更新） ──────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = new_date < today;

    // ── 5. 使用 Git Trees API 原子化更新 ─────────────────────────────────
    const refRes = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const refData = await refRes.json();
    if (!refRes.ok) return respond({ ok: false, error: `取得 ref 失敗: ${refData.message}` }, 500);
    const baseCommitSha = refData.object.sha;
    const commitObj = await (await gh(`/repos/${REPO}/git/commits/${baseCommitSha}`)).json();
    const baseTreeSha = commitObj.tree.sha;

    // 建立文章 blob
    const blobRes = await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: toB64(newContent), encoding: 'base64' }),
    });
    const blobData = await blobRes.json();
    if (!blobRes.ok) return respond({ ok: false, error: `建立 blob 失敗: ${blobData.message}` }, 500);

    const treeItems = [
      { path: filePath, mode: '100644', type: 'blob', sha: blobData.sha },
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

    const newCommitRes = await gh(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `reschedule: ${slug} → ${new_date}\n\n- 更新排程日期\n- 同步更新 _scheduled-meta.json`,
        tree: treeData.sha,
        parents: [baseCommitSha],
        author: { name: 'BNotes Admin', email: 'admin@bnotescoffee.com', date: new Date().toISOString() },
      }),
    });
    const newCommitData = await newCommitRes.json();
    if (!newCommitRes.ok) return respond({ ok: false, error: `建立 commit 失敗: ${newCommitData.message}` }, 500);

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
      message: `《${slug}》已重新安排至 ${new_date}，排程佇列已同步`,
      overdue: isOverdue,
    });

  } catch (err) {
    return respond({ ok: false, error: err.message }, 500);
  }
}
