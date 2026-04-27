/**
 * GET /admin/scheduled-data  v4
 *
 * 讀取 dist/_scheduled-meta.json 取得排程文章的 date/title/category，
 * 再列出 dist/_scheduled/ 實際的 HTML 檔案，合併回傳。
 * v4: 修復 atob() Latin-1 編碼問題 → 改用 TextDecoder 正確解碼 UTF-8
 * Protected by _middleware.js (requires admin cookie)
 */

const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const BASE   = 'https://api.github.com';

// ── UTF-8 安全解碼器（修復 atob() 在 CF Workers 的 Latin-1 問題）─────────
function b64ToUtf8(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

export async function onRequestGet({ env }) {
  const token = env.GITHUB_PAT;
  if (!token) return jsonResp({ ok: false, error: 'GITHUB_PAT 未設定' }, 500);

  const ghHeaders = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'BNotes-Admin/1.0',
  };

  try {
    // ── 1. 讀取 _scheduled-meta.json（使用 TextDecoder 正確解碼 UTF-8）──
    const metaRes = await fetch(
      `${BASE}/repos/${REPO}/contents/dist/_scheduled-meta.json?ref=${BRANCH}`,
      { headers: ghHeaders }
    );
    let metaMap = {};
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      const raw = b64ToUtf8(metaData.content);  // ← 修復：TextDecoder 代替 atob
      metaMap = JSON.parse(raw);
    }

    // ── 2. 列出 _scheduled/ 目錄的實際 HTML 檔案 ──────────────────────────
    const dirRes = await fetch(
      `${BASE}/repos/${REPO}/contents/dist/_scheduled?ref=${BRANCH}`,
      { headers: ghHeaders }
    );
    if (!dirRes.ok) return jsonResp({ ok: false, error: `GitHub API ${dirRes.status}` }, 502);

    const files = await dirRes.json();
    const htmlFiles = Array.isArray(files)
      ? files.filter(f => f.name.endsWith('.html'))
      : [];

    const today = new Date().toISOString().slice(0, 10);

    // ── 3. 合併 meta 與目錄清單 ───────────────────────────────────────────
    const articles = htmlFiles.map(f => {
      const slug = f.name.replace('.html', '');
      const meta = metaMap[slug] || {};
      const dueDate = (meta.date || '').slice(0, 10);
      const daysUntil = dueDate
        ? Math.ceil((new Date(dueDate) - new Date(today)) / 86400000)
        : null;
      return {
        slug,
        title:       meta.title       || slug,
        date:        meta.date        || '',
        category:    meta.category    || 'lifestyle',
        description: meta.description || '',
        cover_image: meta.cover_image || '',
        path:        f.path,
        download_url: f.download_url || '',
        daysUntil,
        overdue:     daysUntil !== null && daysUntil <= 0,
      };
    });

    articles.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return jsonResp({ ok: true, articles });

  } catch (err) {
    return jsonResp({ ok: false, error: err.message }, 500);
  }
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
