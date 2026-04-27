/**
 * POST /api/copy-article
 *
 * 快速複製已發布文章為排程草稿：
 *  1. 讀取 dist/articles/{slug}.html
 *  2. 更新 frontmatter date 為新日期
 *  3. 寫入 dist/_scheduled/{slug}-copy-{YYYYMMDD}.html
 *  4. 同步更新 _scheduled-meta.json
 *
 * Protected by _middleware.js
 */

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
    function b64ToUtf8(b64) {
      const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    }

    // ── 1. 讀取來源文章 ──────────────────────────────────────────────────
    const srcPath = `dist/articles/${slug}.html`;
    const metaPath = 'dist/_scheduled-meta.json';

    const [srcRes, metaRes] = await Promise.all([
      gh(`/repos/${REPO}/contents/${srcPath}?ref=${BRANCH}`),
      gh(`/repos/${REPO}/contents/${metaPath}?ref=${BRANCH}`),
    ]);

    if (!srcRes.ok) return respond({ ok: false, error: `找不到文章: ${slug}` }, 404);
    const srcData = await srcRes.json();
    const srcContent = b64ToUtf8(srcData.content);

    // ── 2. 更新 frontmatter ──────────────────────────────────────────────
    const newSlug = slug + '-copy-' + new_date.replace(/-/g, '');
    let newContent = srcContent.replace(/^date:\s*.+$/m, `date: ${new_date}`);
    // 清除發布狀態標記
    newContent = newContent.replace(/^status:\s*.+$/m, 'status: draft-copy');

    // 解析 title / category / og:image
    const titleM = srcContent.match(/og:title[^>]*content="([^"]+)"/);
    const catM   = srcContent.match(/^category:\s*(.+)$/m);
    const imgM   = srcContent.match(/og:image[^>]*content="([^"]+)"/);

    const title    = titleM ? titleM[1] : newSlug;
    const category = catM   ? catM[1].trim() : 'lifestyle';
    const coverImg = imgM   ? imgM[1] : '';

    // ── 3. 更新 _scheduled-meta.json ────────────────────────────────────
    let metaNewContent = null;
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      try {
        const metaJson = JSON.parse(b64ToUtf8(metaData.content));
        const today = new Date().toISOString().slice(0, 10);
        metaJson[newSlug] = {
          title: '[複製] ' + title,
          date: new_date,
          category,
          cover_image: coverImg,
          description: '',
        };
        metaNewContent = JSON.stringify(metaJson, null, 2);
      } catch { metaNewContent = null; }
    }

    // ── 4. 原子化提交 ────────────────────────────────────────────────────
    const refRes = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const refData = await refRes.json();
    const baseCommitSha = refData.object.sha;
    const commitObj = await (await gh(`/repos/${REPO}/git/commits/${baseCommitSha}`)).json();
    const baseTreeSha = commitObj.tree.sha;

    const dstPath = `dist/_scheduled/${newSlug}.html`;

    const blobRes = await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: toB64(newContent), encoding: 'base64' }),
    });
    const blobData = await blobRes.json();
    if (!blobRes.ok) return respond({ ok: false, error: `建立 blob 失敗: ${blobData.message}` }, 500);

    const treeItems = [{ path: dstPath, mode: '100644', type: 'blob', sha: blobData.sha }];

    if (metaNewContent) {
      const mb = await gh(`/repos/${REPO}/git/blobs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: toB64(metaNewContent), encoding: 'base64' }),
      });
      const mbData = await mb.json();
      if (mb.ok) treeItems.push({ path: metaPath, mode: '100644', type: 'blob', sha: mbData.sha });
    }

    const treeRes = await gh(`/repos/${REPO}/git/trees`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });
    const treeData = await treeRes.json();
    if (!treeRes.ok) return respond({ ok: false, error: `建立 tree 失敗: ${treeData.message}` }, 500);

    const newCommitRes = await gh(`/repos/${REPO}/git/commits`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `copy: ${slug} → ${newSlug} (排程 ${new_date})`,
        tree: treeData.sha,
        parents: [baseCommitSha],
        author: { name: 'BNotes Admin', email: 'admin@bnotescoffee.com', date: new Date().toISOString() },
      }),
    });
    const newCommitData = await newCommitRes.json();
    if (!newCommitRes.ok) return respond({ ok: false, error: `建立 commit 失敗: ${newCommitData.message}` }, 500);

    const updateRefRes = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitData.sha, force: false }),
    });
    if (!updateRefRes.ok) {
      const e = await updateRefRes.json();
      return respond({ ok: false, error: `更新 ref 失敗: ${e.message}` }, 500);
    }

    return respond({
      ok: true,
      commit: newCommitData.sha.slice(0, 7),
      new_slug: newSlug,
      message: `文章《${slug}》已複製為排程草稿 ${newSlug}，預定 ${new_date} 發布`,
    });

  } catch (err) {
    return respond({ ok: false, error: err.message }, 500);
  }
}
