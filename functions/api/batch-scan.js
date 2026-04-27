/**
 * GET /api/batch-scan?type=published|scheduled|all&limit=N
 * v2: CORS + fetch timeout
 *
 * 批次掃描全站文章品質，回傳統計摘要與每篇結果
 * 支援 limit 參數（預設 50，最大 100）
 *
 * Protected by _middleware.js
 */

const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';
const SITE   = 'https://bnotescoffee.com';

export async function onRequestGet({ request, env }) {
  const token = env.GITHUB_PAT;
  if (!token) return json({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

  const url   = new URL(request.url);
  const type  = url.searchParams.get('type') || 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  try {
    const gh = (path) =>
      fetch(`https://api.github.com${path}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'BNotes-Admin/2.0',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(20000),
      });

    const b64ToUtf8 = b64 => {
      const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    };

    // ── 取得文章清單 ────────────────────────────────────────────────────────
    const slugsToScan = [];

    const dirErrors = [];
    if (type === 'published' || type === 'all') {
      const dirRes = await gh(`/repos/${REPO}/contents/dist/articles?ref=${BRANCH}`);
      if (dirRes.ok) {
        const files = await dirRes.json();
        const htmlFiles = Array.isArray(files)
          ? files.filter(f => f.name.endsWith('.html') && f.name !== 'index.html')
          : [];
        htmlFiles.slice(0, type === 'all' ? Math.floor(limit * 0.6) : limit)
                 .forEach(f => slugsToScan.push({
                   slug: f.name.replace('.html', ''),
                   articleType: 'published',
                   dir: 'dist/articles'
                 }));
      } else {
        const errBody = await dirRes.json().catch(() => ({}));
        dirErrors.push(`published dir: HTTP ${dirRes.status} — ${errBody.message || 'unknown'}`);
      }
    }

    if (type === 'scheduled' || type === 'all') {
      const dirRes = await gh(`/repos/${REPO}/contents/dist/_scheduled?ref=${BRANCH}`);
      if (dirRes.ok) {
        const files = await dirRes.json();
        const htmlFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.html')) : [];
        const remaining = limit - slugsToScan.length;
        htmlFiles.slice(0, remaining)
                 .forEach(f => slugsToScan.push({
                   slug: f.name.replace('.html', ''),
                   articleType: 'scheduled',
                   dir: 'dist/_scheduled'
                 }));
      } else {
        const errBody = await dirRes.json().catch(() => ({}));
        dirErrors.push(`scheduled dir: HTTP ${dirRes.status} — ${errBody.message || 'unknown'}`);
      }
    }
    if (dirErrors.length > 0 && slugsToScan.length === 0) {
      return json({ ok: false, error: 'GitHub API 目錄讀取失敗：' + dirErrors.join('; ') }, 502);
    }

    // ── 逐篇掃描（使用 raw URL，避免 API rate limit）────────────────────────
    const results = [];
    const BATCH = 5;  // 並發數

    for (let i = 0; i < slugsToScan.length; i += BATCH) {
      const chunk = slugsToScan.slice(i, i + BATCH);
      const chunkResults = await Promise.all(chunk.map(async ({ slug, articleType, dir }) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${dir}/${slug}.html`;
          const r = await fetch(rawUrl, { headers: { Authorization: `token ${token}` }, signal: AbortSignal.timeout(15000) });
          if (!r.ok) return { slug, articleType, ok: false, error: 'HTTP ' + r.status };
          const html = await r.text();
          const scanResult = scanArticle(slug, html);
          return { slug, articleType, ok: true, ...scanResult };
        } catch (e) {
          return { slug, articleType, ok: false, error: e.message };
        }
      }));
      results.push(...chunkResults);
    }

    // ── 統計摘要 ───────────────────────────────────────────────────────────
    const successful = results.filter(r => r.ok);
    const green  = successful.filter(r => r.light === 'green').length;
    const yellow = successful.filter(r => r.light === 'yellow').length;
    const red    = successful.filter(r => r.light === 'red').length;
    const avgScore = successful.length
      ? Math.round(successful.reduce((s, r) => s + (r.score || 0), 0) / successful.length)
      : 0;

    // 常見問題彙整
    const issueFreq = {};
    successful.forEach(r => {
      (r.issues || []).forEach(issue => {
        const key = issue.substring(0, 40);
        issueFreq[key] = (issueFreq[key] || 0) + 1;
      });
    });
    const topIssues = Object.entries(issueFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));

    // 需要修復的文章（red + yellow）
    const needsFix = successful
      .filter(r => r.light !== 'green')
      .sort((a, b) => (a.score || 0) - (b.score || 0))
      .map(r => ({
        slug: r.slug, type: r.articleType,
        score: r.score, light: r.light,
        issueCount: (r.issues || []).length,
        topIssue: (r.issues || [])[0] || (r.warnings || [])[0] || ''
      }));

    return json({
      ok: true,
      scanned: results.length,
      summary: { green, yellow, red, avgScore, failed: results.filter(r => !r.ok).length },
      topIssues,
      needsFix,
      results: successful.map(r => ({
        slug: r.slug, type: r.articleType,
        score: r.score, light: r.light, lightLabel: r.lightLabel,
        issues: r.issues || [], warnings: r.warnings || [],
        dimensions: r.dimensions || {}
      }))
    });

  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

// ── 掃描引擎（與 quality-scan.js 保持同步）────────────────────────────────────
function scanArticle(slug, html) {
  const issues = [], warnings = [], passes = [];
  let score = 0;

  const fmMatch = html.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  const fm = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const m = line.match(/^(\w[\w_-]*):\s*(.+)/);
      if (m) fm[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }

  const bodyStart = html.indexOf('<body');
  const bodyHtml  = bodyStart >= 0 ? html.slice(bodyStart) : html;
  const bodyText  = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '')
                             .replace(/<style[\s\S]*?<\/style>/gi, '')
                             .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const articleEl  = html.match(/<article[\s\S]*?<\/article>/i);
  const articleTxt = articleEl
    ? articleEl[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    : bodyText;
  const zhCount = (articleTxt.match(/[\u4e00-\u9fff]/g) || []).length;

  // A. SEO
  let seoScore = 0;
  // 支援 frontmatter 格式：<title> 缺失時回退到 fm.title
  const titleText = (html.match(/<title>([^<]+)<\/title>/i) || [])[1]?.trim() || fm.title || '';
  if (titleText.length >= 15 && titleText.length <= 70) { seoScore += 5; passes.push('標題長度符合'); }
  else if (titleText.length > 0) { seoScore += 2; warnings.push(`標題長度 ${titleText.length} 字元，建議 15–70`); }
  else issues.push('缺少標題');

  // 支援 frontmatter 格式：<meta description> 缺失時回退到 fm.description
  const descText = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || [])[1] || fm.description || '';
  if (descText.length >= 70 && descText.length <= 160) { seoScore += 5; passes.push('Meta description 符合'); }
  else if (descText.length > 0) { seoScore += 2; warnings.push(`Meta description ${descText.length} 字元，建議 70–160`); }
  else issues.push('缺少 description');

  // 支援 frontmatter 格式：OG tags 缺失時從 frontmatter 推斷
  const hasOgTitle = /og:title/.test(html) || !!fm.title;
  const hasOgImg   = /og:image/.test(html) || !!fm.cover_image;
  const hasOgDesc  = /og:description/.test(html) || !!fm.description;
  if (hasOgTitle && hasOgImg && hasOgDesc) { seoScore += 5; passes.push('Open Graph 完整'); }
  else { seoScore += 2; warnings.push('Open Graph 不完整（缺 ' + [!hasOgTitle&&'title', !hasOgImg&&'image', !hasOgDesc&&'desc'].filter(Boolean).join('/') + '）'); }

  if (/application\/ld\+json/.test(html)) { seoScore += 5; passes.push('含 Schema.org'); }
  else issues.push('缺少 Schema.org JSON-LD');

  if (/rel=["']canonical["']/.test(html)) { seoScore += 3; passes.push('含 canonical'); }
  else warnings.push('建議加入 canonical 標籤');

  const missingFm = ['title','date','category','description','cover_image','reading_time'].filter(k => !fm[k]);
  if (missingFm.length === 0) { seoScore += 2; passes.push('Frontmatter 完整'); }
  else issues.push('Frontmatter 缺少：' + missingFm.join('、'));

  score += Math.min(seoScore, 25);

  // B. Content
  let contentScore = 0;
  if (zhCount >= 2000) { contentScore += 12; passes.push(`中文 ${zhCount} 字`); }
  else if (zhCount >= 1200) { contentScore += 7; warnings.push(`中文 ${zhCount} 字，建議達 2000`); }
  else if (zhCount >= 600) { contentScore += 4; warnings.push(`中文 ${zhCount} 字，偏短`); }
  else { contentScore += 1; issues.push(`中文僅 ${zhCount} 字`); }

  const readingTime = parseInt(fm.reading_time || '0');
  if (readingTime >= 6) { contentScore += 4; }
  else if (readingTime > 0) { contentScore += 2; warnings.push(`閱讀 ${readingTime} 分，建議 6+`); }
  else warnings.push('缺 reading_time');

  const extLinks = (html.match(/href=["']https?:\/\/(?!bnotescoffee)[^"']+["']/g) || []).length;
  if (extLinks >= 2) contentScore += 4;
  else if (extLinks === 1) { contentScore += 2; warnings.push('外部連結偏少'); }
  else warnings.push('無外部參考連結');

  const hasProfEl = /<table|<blockquote|<code|<pre|<figure/.test(html);
  if (hasProfEl) contentScore += 4;
  else warnings.push('建議加入表格/引用等專業元素');

  const intLinks = (html.match(/href=["']\/articles\/[^"']+["']/g) || []).length;
  if (intLinks >= 2) contentScore += 3;
  else if (intLinks === 1) { contentScore += 1; warnings.push('內部連結偏少'); }
  else warnings.push('無內部連結');

  if (/author|作者|BNotes/.test(bodyHtml)) contentScore += 3;
  else warnings.push('建議標示作者');

  score += Math.min(contentScore, 30);

  // C. Image
  let imgScore = 0;
  // 支援相對路徑 cover_image（/images/ai/...）
  if (fm.cover_image) {
    imgScore += 6;
    if (/\/images\/ai\//.test(fm.cover_image)) imgScore += 2;
  } else issues.push('缺少 cover_image');

  const allImgs  = (html.match(/<img[^>]+>/gi) || []);
  const withAlt  = allImgs.filter(i => /alt=["'][^"']{3,}["']/.test(i));
  if (allImgs.length === 0) { imgScore += 3; warnings.push('文章內無圖片'); }
  else if (withAlt.length / allImgs.length >= 0.9) { imgScore += 6; }
  else { imgScore += 2; issues.push(`${allImgs.length - withAlt.length} 張圖片缺 alt`); }

  // 支援 frontmatter 格式：og:image 由 cover_image 動態生成
  const ogImgOk = /og:image["']?\s+content=["']https/.test(html) || !!fm.cover_image;
  if (ogImgOk) imgScore += 6;
  else issues.push('缺少 og:image');

  score += Math.min(imgScore, 20);

  // D. Structure
  let structScore = 0;
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  if (h2Count >= 4) { structScore += 6; }
  else if (h2Count >= 2) { structScore += 3; warnings.push(`H2 ${h2Count} 個，建議 4+`); }
  else issues.push('H2 標題不足');

  if (h1Count === 1) structScore += 3;
  else if (h1Count > 1) warnings.push(`H1 ${h1Count} 次，應唯一`);
  // 支援 frontmatter 格式：標題由渲染模板注入為 H1
  else if (fm.title) { structScore += 3; passes.push('H1 由 frontmatter title 渲染注入'); }
  else issues.push('缺少 H1 標題');

  const pCount = (html.match(/<p[^>]*>/gi) || []).length;
  if (pCount >= 8 || (html.match(/<li[^>]*>/gi) || []).length >= 6) structScore += 3;
  else warnings.push('段落列表偏少');

  if (/訂閱|分享|留言|延伸閱讀|相關文章/.test(bodyText)) structScore += 3;
  else warnings.push('建議加入 CTA/延伸閱讀');

  score += Math.min(structScore, 15);

  // E. AI
  let aiScore = 0;
  const hasSchema = /application\/ld\+json/.test(html);
  const hasFAQ    = /FAQPage|HowTo|Article|NewsArticle/.test(html);
  if (hasSchema && hasFAQ) aiScore += 4;
  else if (hasSchema) { aiScore += 2; warnings.push('Schema 缺 FAQPage/HowTo'); }
  else issues.push('缺結構化資料');

  if (/研究|數據|實驗|科學|分析|根據|報告/.test(bodyText)) aiScore += 3;
  else warnings.push('建議加入數據引用');

  if (fm.title?.length >= 15 && slug.length >= 10) aiScore += 3;
  else warnings.push('標題或 slug 不夠具體');

  score += Math.min(aiScore, 10);

  const totalScore = Math.min(Math.round(score), 100);
  let light, lightLabel, lightColor;
  if (totalScore >= 80) { light = 'green'; lightLabel = '🟢 可發布'; lightColor = '#188038'; }
  else if (totalScore >= 60) { light = 'yellow'; lightLabel = '🟡 建議修正'; lightColor = '#c47e2b'; }
  else { light = 'red'; lightLabel = '🔴 需要修改'; lightColor = '#d93025'; }

  return {
    score: totalScore, light, lightLabel, lightColor,
    dimensions: {
      seo: Math.min(seoScore, 25), content: Math.min(contentScore, 30),
      image: Math.min(imgScore, 20), structure: Math.min(structScore, 15),
      ai: Math.min(aiScore, 10),
    },
    passes, warnings, issues,
    meta: { zhCount, h2Count, extLinks, readingTime: parseInt(fm.reading_time||'0'), hasSchema }
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache',
      'Access-Control-Allow-Origin': 'https://bnotescoffee.com',
    },
  });
}
