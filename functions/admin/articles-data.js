/**
 * GET /admin/articles-data  v2
 *
 * Server-side GitHub article listing — protected by _middleware.js.
 * v2: 新增 cover_image 解析（供後台圖片預覽），從 og:image 或 cover_image frontmatter 取得
 */

const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const BASE   = 'https://api.github.com';

export async function onRequestGet({ env }) {
  const token = env.GITHUB_PAT;
  if (!token) {
    return jsonResp({ ok: false, error: 'GITHUB_PAT 尚未設定' }, 500);
  }

  const gh = (path) =>
    fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'BNotes-Admin/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

  try {
    const dirRes = await gh(`/repos/${REPO}/contents/dist/articles?ref=${BRANCH}`);
    if (dirRes.status === 401) {
      return jsonResp({ ok: false, error: 'GITHUB_PAT 無效或已過期' }, 401);
    }
    if (!dirRes.ok) {
      const e = await dirRes.json().catch(() => ({}));
      return jsonResp({ ok: false, error: `GitHub API 錯誤：${e.message || dirRes.status}` }, 502);
    }

    const files    = await dirRes.json();
    const htmlFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.html') && f.name !== 'index.html') : [];

    const articles = await Promise.all(
      htmlFiles.map(async (f) => {
        const slug = f.name.replace('.html', '');
        try {
          const r    = await fetch(f.download_url);
          const text = await r.text();
          const fm   = parseFrontmatter(text);
          // 從 og:image 補充 cover_image
          const ogImage = text.match(/og:image.*?content="([^"]+)"/)?.[1] || '';
          return {
            slug,
            title:       fm.title       || slug,
            date:        fm.date        || '',
            category:    fm.category    || 'lifestyle',
            cover_image: fm.cover_image || ogImage || '',
            path:        f.path,
            download_url: f.download_url || '',
          };
        } catch {
          return { slug, title: slug, date: '', category: 'lifestyle', cover_image: '', path: f.path, download_url: '' };
        }
      }),
    );

    articles.sort((a, b) => b.date.localeCompare(a.date));
    return jsonResp({ ok: true, articles }, 200);
  } catch (err) {
    return jsonResp({ ok: false, error: `伺服器錯誤：${err.message}` }, 500);
  }
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function parseFrontmatter(html) {
  const match = html.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w[\w_-]*):\s*(.+)/);
    if (m) result[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}
