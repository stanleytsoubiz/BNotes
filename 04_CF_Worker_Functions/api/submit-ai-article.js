/**
 * POST /api/submit-ai-article
 *
 * Skywork AI Agent 呼叫此端點，將 AI 生成的文章存入
 * dist/_pending-ai-review/{slug}.html
 * 並觸發 Cloudflare Pages 重新部署，讓後台「AI 待審」Tab 顯示。
 *
 * Request JSON:
 * {
 *   api_key: string,           // SUBMIT_AI_KEY Cloudflare Secret
 *   slug: string,              // URL slug（英文小寫 + 連字號）
 *   title: string,             // 文章標題
 *   date: string,              // 預定發布日 YYYY-MM-DD
 *   category: string,          // pour-over | espresso | equipment | terroir | science | lifestyle
 *   description: string,       // SEO meta description
 *   reading_time: number,      // 預估閱讀分鐘數
 *   cover_image: string,       // 封面圖 URL
 *   html_content: string,      // 完整 HTML 正文（不含 frontmatter）
 *   ai_model: string,          // 生成模型標記 e.g. "skywork-agent-v1"
 *   topics_source: string,     // 主題來源描述
 *   quality_score: number,     // AI 自評品質分數 0–100
 * }
 *
 * Response: { ok: true, commit: "sha7", slug, message }
 *           { ok: false, error: "..." }
 */

const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const BASE   = 'https://api.github.com';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost({ request, env }) {
  const respond = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return respond({ ok: false, error: '無效 JSON' }, 400);

    // ── 驗證 API Key ──────────────────────────────────────────────────────
    const submitKey = env.SUBMIT_AI_KEY;
    if (!submitKey || body.api_key !== submitKey) {
      return respond({ ok: false, error: '未授權：API Key 不符' }, 401);
    }

    // ── 驗證必填欄位 ──────────────────────────────────────────────────────
    const required = ['slug', 'title', 'date', 'category', 'html_content'];
    for (const f of required) {
      if (!body[f]) return respond({ ok: false, error: `缺少必填欄位：${f}` }, 400);
    }

    // 驗證 slug 格式（英數 + 連字號）
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return respond({ ok: false, error: 'slug 格式不正確（只允許英文小寫、數字、連字號）' }, 400);
    }

    const validCats = ['pour-over', 'espresso', 'equipment', 'terroir', 'science', 'lifestyle'];
    if (!validCats.includes(body.category)) {
      return respond({ ok: false, error: `無效分類：${body.category}` }, 400);
    }

    // ── 組合完整 HTML 文件（YAML Frontmatter + HTML）─────────────────────
    const now = new Date().toISOString();
    const frontmatter = [
      '---',
      `title: "${body.title.replace(/"/g, '\\"')}"`,
      `date: ${body.date}`,
      `category: ${body.category}`,
      `description: "${(body.description || '').replace(/"/g, '\\"')}"`,
      `cover_image: "${body.cover_image || ''}"`,
      `reading_time: ${body.reading_time || 8}`,
      `featured: false`,
      `ai_generated: true`,
      `ai_model: "${body.ai_model || 'skywork-agent'}"`,
      `ai_submitted_at: "${now}"`,
      `topics_source: "${(body.topics_source || '').replace(/"/g, '\\"')}"`,
      `quality_score: ${body.quality_score || 0}`,
      `status: pending-review`,
      '---',
    ].join('\n');

    const fullContent = `${frontmatter}\n${body.html_content}`;

    // ── GitHub API ────────────────────────────────────────────────────────
    const token = env.GITHUB_PAT;
    if (!token) return respond({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

    const gh = (path, opts = {}) =>
      fetch(`${BASE}${path}`, {
        ...opts,
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'BNotes-AI-Submitter/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(opts.headers || {}),
        },
      });

    const toB64 = str => btoa(unescape(encodeURIComponent(str)));

    // 取得 HEAD ref
    const refRes = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const refData = await refRes.json();
    if (!refRes.ok) return respond({ ok: false, error: `Git ref 失敗: ${refData.message}` }, 502);

    const headSha     = refData.object.sha;
    const headCommit  = await (await gh(`/repos/${REPO}/git/commits/${headSha}`)).json();
    const baseTreeSha = headCommit.tree.sha;

    const targetPath = `dist/_pending-ai-review/${body.slug}.html`;

    // 建立 blob
    const blobRes  = await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: toB64(fullContent), encoding: 'base64' }),
    });
    const blobData = await blobRes.json();
    if (!blobRes.ok) return respond({ ok: false, error: `建立 blob 失敗: ${blobData.message}` }, 502);

    // 建立 tree
    const treeRes  = await gh(`/repos/${REPO}/git/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [{ path: targetPath, mode: '100644', type: 'blob', sha: blobData.sha }],
      }),
    });
    const treeData = await treeRes.json();
    if (!treeRes.ok) return respond({ ok: false, error: `建立 tree 失敗: ${treeData.message}` }, 502);

    // 建立 commit
    const commitRes  = await gh(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `ai-submit: [pending review] ${body.slug}\n\n- 主題: ${body.title}\n- 分類: ${body.category}\n- AI品質分: ${body.quality_score || 'N/A'}\n- 模型: ${body.ai_model || 'skywork-agent'}`,
        tree: treeData.sha,
        parents: [headSha],
        author: {
          name: 'Skywork AI Agent',
          email: 'ai-agent@bnotescoffee.com',
          date: now,
        },
      }),
    });
    const commitData = await commitRes.json();
    if (!commitRes.ok) return respond({ ok: false, error: `建立 commit 失敗: ${commitData.message}` }, 502);

    // Push
    const pushRes  = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commitData.sha, force: false }),
    });
    const pushData = await pushRes.json();
    if (!pushRes.ok) return respond({ ok: false, error: `Push 失敗: ${pushData.message}` }, 502);

    return respond({
      ok: true,
      commit: commitData.sha.slice(0, 7),
      slug: body.slug,
      path: targetPath,
      message: `✅ AI 文章《${body.title}》已提交待審，Cloudflare Pages 部署中...`,
    });

  } catch (err) {
    return respond({ ok: false, error: `伺服器錯誤: ${err.message}` }, 500);
  }
}
