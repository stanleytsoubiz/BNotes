/**
 * GET /admin/ai-pending-data
 *
 * 讀取 dist/_pending-ai-review/ 目錄下所有 AI 生成待審文章
 * 解析 YAML Frontmatter，回傳結構化列表供後台 AI待審 Tab 顯示
 *
 * Protected by _middleware.js (requires admin cookie)
 */

const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const BASE   = 'https://api.github.com';

export async function onRequestGet({ env }) {
  const token = env.GITHUB_PAT;
  if (!token) return jsonResp({ ok: false, error: 'GITHUB_PAT 未設定' }, 500);

  const gh = (path) => fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'BNotes-Admin/1.0',
    },
  });

  try {
    // 讀取 _pending-ai-review/ 目錄
    const dirRes = await gh(`/repos/${REPO}/contents/dist/_pending-ai-review?ref=${BRANCH}`);

    // 目錄不存在 → 回傳空列表（第一次使用前正常）
    if (dirRes.status === 404) {
      return jsonResp({ ok: true, articles: [], total: 0 });
    }
    if (!dirRes.ok) {
      const e = await dirRes.json().catch(() => ({}));
      return jsonResp({ ok: false, error: `GitHub API ${dirRes.status}: ${e.message || ''}` }, 502);
    }

    const files = await dirRes.json();
    const htmlFiles = Array.isArray(files)
      ? files.filter(f => f.name.endsWith('.html'))
      : [];

    if (htmlFiles.length === 0) {
      return jsonResp({ ok: true, articles: [], total: 0 });
    }

    // 平行下載並解析每篇文章
    const articles = await Promise.all(
      htmlFiles.map(async (f) => {
        const slug = f.name.replace('.html', '');
        try {
          const r    = await fetch(f.download_url);
          const text = await r.text();
          const fm   = parseFrontmatter(text);
          const today = new Date().toISOString().slice(0, 10);
          const dueDate = (fm.date || '').slice(0, 10);
          const daysUntil = dueDate
            ? Math.ceil((new Date(dueDate) - new Date(today)) / 86400000)
            : null;

          return {
            slug,
            title:           fm.title       || slug,
            date:            fm.date        || '',
            category:        fm.category    || 'lifestyle',
            description:     fm.description || '',
            cover_image:     fm.cover_image || '',
            reading_time:    parseInt(fm.reading_time) || 8,
            ai_model:        fm.ai_model    || 'skywork-agent',
            ai_submitted_at: fm.ai_submitted_at || '',
            topics_source:   fm.topics_source   || '',
            quality_score:   parseInt(fm.quality_score) || 0,
            path:            f.path,
            download_url:    f.download_url,
            daysUntil,
            overdue: daysUntil !== null && daysUntil <= 0,
          };
        } catch {
          return {
            slug, title: slug, date: '', category: 'lifestyle',
            description: '', cover_image: '', reading_time: 8,
            ai_model: 'unknown', ai_submitted_at: '', topics_source: '',
            quality_score: 0, path: f.path, download_url: f.download_url,
            daysUntil: null, overdue: false,
          };
        }
      })
    );

    // 依提交時間排序（最新在前）
    articles.sort((a, b) =>
      (b.ai_submitted_at || '').localeCompare(a.ai_submitted_at || '')
    );

    return jsonResp({ ok: true, articles, total: articles.length });

  } catch (err) {
    return jsonResp({ ok: false, error: err.message }, 500);
  }
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function parseFrontmatter(html) {
  const match = html.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([\w_-]+):\s*(.+)/);
    if (m) result[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}
