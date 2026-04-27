/**
 * POST /api/edit-article
 *
 * 儲存編輯後的文章內容到 GitHub
 * Body: { slug, type, content }
 *   type: "published" => dist/articles/
 *         "scheduled" => dist/_scheduled/
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
    if (!body?.slug || !body?.type || body?.content === undefined)
      return respond({ ok: false, error: '缺少 slug、type 或 content' }, 400);

    const token = env.GITHUB_PAT;
    if (!token) return respond({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

    const { slug, type, content } = body;

    if (!/^[a-z0-9._-]+$/.test(slug))
      return respond({ ok: false, error: 'slug 格式不正確' }, 400);
    if (!['published', 'scheduled'].includes(type))
      return respond({ ok: false, error: 'type 只能是 published 或 scheduled' }, 400);
    if (content.length > 2_000_000)
      return respond({ ok: false, error: '文章內容過大（超過 2MB）' }, 400);

    const dir = type === 'published' ? 'dist/articles' : 'dist/_scheduled';
    const filePath = `${dir}/${slug}.html`;

    const ghHeaders = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'BNotes-Admin/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // ── 1. 取得當前檔案 SHA ─────────────────────────────────────────────────
    const fileRes = await fetch(`${BASE}/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`, {
      headers: ghHeaders,
    });
    if (!fileRes.ok) {
      const e = await fileRes.json().catch(() => ({}));
      return respond({ ok: false, error: `找不到文章: ${e.message || filePath}` }, 404);
    }
    const fileData = await fileRes.json();
    const fileSha  = fileData.sha;

    // ── 2. 特殊處理：如果是排程文章，同步更新 _scheduled-meta.json 中的日期 ──
    let metaUpdated = false;
    if (type === 'scheduled') {
      const dateMatch = content.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
      if (dateMatch) {
        const newDate = dateMatch[1];
        // 讀取 meta JSON
        const metaRes = await fetch(
          `${BASE}/repos/${REPO}/contents/dist/_scheduled-meta.json?ref=${BRANCH}`,
          { headers: ghHeaders }
        );
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const metaMap  = JSON.parse(b64ToUtf8(metaData.content));
          if (metaMap[slug] && metaMap[slug].date !== newDate) {
            metaMap[slug].date = newDate;
            const toB64 = str => { const b = new TextEncoder().encode(str); let s=''; b.forEach(c=>s+=String.fromCharCode(c)); return btoa(s); };
            await fetch(`${BASE}/repos/${REPO}/contents/dist/_scheduled-meta.json`, {
              method: 'PUT',
              signal: AbortSignal.timeout(20000),
              headers: { ...ghHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `meta: update date for ${slug}`,
                content: toB64(JSON.stringify(metaMap, null, 2)),
                sha: metaData.sha,
                branch: BRANCH,
                committer: { name: 'BNotes Admin', email: 'admin@bnotescoffee.com' },
              }),
            });
            metaUpdated = true;
          }
        }
      }
    }

    // ── 3. 更新文章 HTML 檔案 ──────────────────────────────────────────────
    const toB64 = str => { const b = new TextEncoder().encode(str); let s=''; b.forEach(c=>s+=String.fromCharCode(c)); return btoa(s); };
    const updateRes = await fetch(`${BASE}/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(20000),
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `edit(${type}): save changes to ${slug}`,
        content: toB64(content),
        sha: fileSha,
        branch: BRANCH,
        committer: { name: 'BNotes Admin', email: 'admin@bnotescoffee.com' },
      }),
    });

    const updateData = await updateRes.json();
    if (!updateRes.ok) {
      return respond({ ok: false, error: `儲存失敗: ${updateData.message}` }, 500);
    }

    const commitSha = updateData.commit?.sha?.slice(0, 8) || '?';
    return respond({
      ok: true,
      message: `文章已儲存${metaUpdated ? '（日期同步更新）' : ''}，Cloudflare 30–60 秒重新部署`,
      commit: commitSha,
    });

  } catch (err) {
    return respond({ ok: false, error: err.message }, 500);
  }
}
