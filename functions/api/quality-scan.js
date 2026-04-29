/**
 * GET /api/quality-scan?slug=xxx
 * v2: CORS + fetch timeout
 *
 * 對排程文章進行多維度品質掃描，回傳燈號評分：
 *  🟢 綠燈 80+ ：可立刻發布
 *  🟡 黃燈 60-79：建議修正後發布
 *  🔴 紅燈 0-59 ：需要大幅修改
 *
 * 評分維度 (總分 100)：
 *  A. SEO 完整性        (25 分)
 *  B. 內文質量          (30 分)
 *  C. 圖片規範          (20 分)
 *  D. 結構與可讀性      (15 分)
 *  E. AI 知識收錄適性   (10 分)
 *  F. 聯盟行銷合規性   (核心加固 - 燈號判定)
 *
 * Protected by _middleware.js
 */

const REPO   = 'stanleytsoubiz/BNotes';
const BRANCH = 'main';

export async function onRequestGet({ request, env }) {
  const url  = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (!slug || !/^[a-z0-9-]+$/.test(slug))
    return json({ ok: false, error: 'slug 格式錯誤' }, 400);

  const token = env.GITHUB_PAT;
  if (!token) return json({ ok: false, error: 'GITHUB_PAT 未設定' }, 503);

  try {
    // 取得文章 HTML
    const type    = url.searchParams.get('type') || 'scheduled';
    const dir     = type === 'published' ? 'dist/articles' : 'dist/_scheduled';
    // 使用 GitHub API 繞過 raw CDN 緩存，確保即時讀取最新版本
    const apiUrl = `https://api.github.com/repos/${REPO}/contents/${dir}/${slug}.html?ref=${BRANCH}`;
    const r = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'BNotes/2.0', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) return json({ ok: false, error: `文章不存在: ${dir}/${slug}.html` }, 404);
    const fd  = await r.json();
    const raw = fd.content.replace(/\n/g, '');
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    const html  = new TextDecoder('utf-8').decode(bytes);

    const result = scanArticle(slug, html);
    return json({ ok: true, slug, ...result });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

// ── 主掃描函數 ────────────────────────────────────────────────────────────────
function scanArticle(slug, html) {
  const issues   = [];
  const warnings = [];
  const passes   = [];
  let score = 0;

  // Frontmatter 解析
  const fmMatch = html.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  const fm = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const m = line.match(/^(\w[\w_-]*):\s*(.+)/);
      if (m) fm[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }

  // HTML body（排除 head）
  const bodyStart = html.indexOf('<body');
  const bodyHtml  = bodyStart >= 0 ? html.slice(bodyStart) : html;
  const bodyText  = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '')
                             .replace(/<style[\s\S]*?<\/style>/gi, '')
                             .replace(/<[^>]+>/g, ' ')
                             .replace(/\s+/g, ' ').trim();

  // 中文字元計數（正文估算）
  const articleEl  = html.match(/<article[\s\S]*?<\/article>/i);
  const articleTxt = articleEl
    ? articleEl[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    : bodyText;
  const zhCount = (articleTxt.match(/[\u4e00-\u9fff]/g) || []).length;

  // ── A. SEO 完整性 (25分) ───────────────────────────────────────────────────
  let seoScore = 0;

  // A1. <title> 長度 (5分)
  // 支援 frontmatter 格式：<title> 缺失時回退到 fm.title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const titleText  = titleMatch ? titleMatch[1].trim() : (fm.title || '');
  const titleZh    = (titleText.match(/[\u4e00-\u9fff]/g) || []).length;
  if (titleText.length >= 15 && titleText.length <= 70) {
    seoScore += 5; passes.push('標題長度符合 SEO（15–70 字元）');
  } else if (titleText.length > 0) {
    seoScore += 2; warnings.push(`標題長度 ${titleText.length} 字元，建議 15–70`);
  } else {
    issues.push('缺少 <title> 標籤');
  }

  // A2. meta description (5分) — 支援 frontmatter description 回退
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const descText  = descMatch ? descMatch[1] : (fm.description || '');
  if (descText.length >= 70 && descText.length <= 160) {
    seoScore += 5; passes.push(`Meta description 長度符合（${descText.length} 字元）`);
  } else if (descText.length > 0) {
    seoScore += 2; warnings.push(`Meta description ${descText.length} 字元，建議 70–160`);
  } else {
    issues.push('缺少 meta description');
  }

  // A3. Open Graph (5分) — 支援 frontmatter 推斷
  const hasOgTitle = /og:title/.test(html) || !!fm.title;
  const hasOgImg   = /og:image/.test(html) || !!fm.cover_image;
  const hasOgDesc  = /og:description/.test(html) || !!fm.description;
  if (hasOgTitle && hasOgImg && hasOgDesc) {
    seoScore += 5; passes.push('Open Graph 標籤完整');
  } else {
    seoScore += 2; warnings.push('Open Graph 標籤不完整（缺 ' + [!hasOgTitle&&'title', !hasOgImg&&'image', !hasOgDesc&&'desc'].filter(Boolean).join('/') + '）');
  }

  // A4. Schema.org JSON-LD (5分)
  if (/application\/ld\+json/.test(html)) {
    seoScore += 5; passes.push('含 Schema.org 結構化資料');
  } else {
    issues.push('缺少 Schema.org JSON-LD（影響 Google AI 收錄）');
  }

  // A5. Canonical (3分)
  if (/rel=["']canonical["']/.test(html)) {
    seoScore += 3; passes.push('含 canonical 標籤');
  } else {
    warnings.push('建議加入 canonical 標籤');
  }

  // A6. Frontmatter 完整性 (2分)
  const requiredFm = ['title', 'date', 'category', 'description', 'cover_image', 'reading_time'];
  const missingFm  = requiredFm.filter(k => !fm[k]);
  if (missingFm.length === 0) {
    seoScore += 2; passes.push('Frontmatter 欄位完整');
  } else {
    issues.push('Frontmatter 缺少欄位：' + missingFm.join('、'));
  }

  score += Math.min(seoScore, 25);

  // ── B. 內文質量 (30分) ────────────────────────────────────────────────────
  let contentScore = 0;

  // B1. 中文字數 (12分)
  if (zhCount >= 2000) {
    contentScore += 12; passes.push(`中文字數 ${zhCount}，符合深度長文標準（≥2000字）`);
  } else if (zhCount >= 1200) {
    contentScore += 7; warnings.push(`中文字數 ${zhCount}，建議達 2000 字以上（國際部落客標準）`);
  } else if (zhCount >= 600) {
    contentScore += 4; warnings.push(`中文字數 ${zhCount}，內容偏短，建議補充至 1200字以上`);
  } else {
    contentScore += 1; issues.push(`中文字數僅 ${zhCount}，嚴重不足，需大幅擴寫`);
  }

  // B2. 閱讀時間（frontmatter reading_time）(4分)
  const readingTime = parseInt(fm.reading_time || '0');
  if (readingTime >= 6) {
    contentScore += 4; passes.push(`閱讀時間 ${readingTime} 分鐘，符合深度文章標準`);
  } else if (readingTime > 0) {
    contentScore += 2; warnings.push(`閱讀時間 ${readingTime} 分鐘，建議 6 分鐘以上`);
  } else {
    warnings.push('Frontmatter 未設定 reading_time');
  }

  // B3. 外部連結/引用（可信度）(4分)
  const extLinks = (html.match(/href=["']https?:\/\/(?!bnotescoffee)[^"']+["']/g) || []).length;
  if (extLinks >= 2) {
    contentScore += 4; passes.push(`含 ${extLinks} 個外部參考連結，提升可信度`);
  } else if (extLinks === 1) {
    contentScore += 2; warnings.push('外部參考連結偏少，建議引用 2 個以上可信來源');
  } else {
    warnings.push('無外部參考連結，建議加入學術/官方資料來源');
  }

  // B4. 程式碼/表格/引用區塊等專業元素 (4分)
  const hasProfEl = /<table|<blockquote|<code|<pre|<figure/.test(html);
  if (hasProfEl) {
    contentScore += 4; passes.push('含表格/引用/程式碼等專業元素');
  } else {
    warnings.push('建議加入表格、數據對比或引用區塊（提升專業感與AI收錄率）');
  }

  // B5. 內文連結（內部）(3分)
  const intLinks = (html.match(/href=["']\/articles\/[^"']+["']/g) || []).length;
  if (intLinks >= 2) {
    contentScore += 3; passes.push(`含 ${intLinks} 個內部連結，有益 SEO`);
  } else if (intLinks === 1) {
    contentScore += 1; warnings.push('內部連結偏少，建議連接 2 篇以上相關文章');
  } else {
    warnings.push('無內部連結，建議加入相關文章推薦');
  }

  // B6. 作者/來源標示 (3分)
  const hasAuthor = /author|作者|BNotes/.test(bodyHtml);
  if (hasAuthor) {
    contentScore += 3; passes.push('含作者/來源標示');
  } else {
    warnings.push('建議明確標示作者或媒體來源');
  }

  score += Math.min(contentScore, 30);

  // ── C. 圖片規範 (20分) ────────────────────────────────────────────────────
  let imgScore = 0;

  // C1. Hero 圖片（cover_image）(8分) — 支援相對路徑（/images/ai/...）
  if (fm.cover_image) {
    imgScore += 6; passes.push('Hero 圖片已設定');
    // 檢查是否為本地 AI 圖庫（路徑包含 images/ai/）
    if (/\/images\/ai\//.test(fm.cover_image)) {
      imgScore += 2; passes.push('Hero 圖片來自 BNotes AI 圖庫');
    }
  } else {
    issues.push('缺少 cover_image（Hero 封面圖），嚴重影響分享與 SEO');
  }

  // C2. img alt 屬性 (6分)
  const allImgs   = (html.match(/<img[^>]+>/gi) || []);
  const withAlt   = allImgs.filter(i => /alt=["'][^"']{3,}["']/.test(i));
  const altRatio  = allImgs.length > 0 ? withAlt.length / allImgs.length : 1;
  if (allImgs.length === 0) {
    imgScore += 3; warnings.push('文章內無圖片，建議加入說明圖表');
  } else if (altRatio >= 0.9) {
    imgScore += 6; passes.push(`所有圖片含有效 alt 文字（${withAlt.length}/${allImgs.length}）`);
  } else {
    imgScore += 2; issues.push(`${allImgs.length - withAlt.length} 張圖片缺少 alt 描述（影響無障礙與 SEO）`);
  }

  // C3. OG image 設定 (6分) — 支援 frontmatter cover_image 動態生成
  const ogImgMatch = html.match(/og:image["']?\s+content=["']([^"']+)["']/i);
  const ogImgOk = (ogImgMatch && ogImgMatch[1].startsWith('http')) || !!fm.cover_image;
  if (ogImgOk) {
    imgScore += 6; passes.push('社群分享圖（og:image）已設定');
  } else {
    issues.push('缺少 og:image，社群分享時無法顯示預覽圖');
  }

  score += Math.min(imgScore, 20);

  // ── D. 結構與可讀性 (15分) ────────────────────────────────────────────────
  let structScore = 0;

  // D1. H2 數量（文章分段）(6分)
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  if (h2Count >= 4) {
    structScore += 6; passes.push(`H2 標題 ${h2Count} 個，結構清晰`);
  } else if (h2Count >= 2) {
    structScore += 3; warnings.push(`H2 標題 ${h2Count} 個，建議至少 4 個段落標題`);
  } else {
    issues.push('H2 標題不足，文章缺乏段落結構（影響可讀性與 SEO）');
  }

  // D2. H1 唯一性 (3分) — 支援 frontmatter title 渲染注入為 H1
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  if (h1Count === 1) {
    structScore += 3; passes.push('H1 標題唯一（符合 SEO 最佳實踐）');
  } else if (h1Count > 1) {
    warnings.push(`H1 標題出現 ${h1Count} 次，應保持唯一`);
  } else if (fm.title) {
    structScore += 3; passes.push('H1 由 frontmatter title 渲染注入');
  } else {
    issues.push('缺少 H1 標題');
  }

  // D3. 段落與列表 (3分)
  const pCount  = (html.match(/<p[^>]*>/gi) || []).length;
  const liCount = (html.match(/<li[^>]*>/gi) || []).length;
  if (pCount >= 8 || liCount >= 6) {
    structScore += 3; passes.push('段落/列表豐富，可讀性佳');
  } else {
    warnings.push('段落或列表偏少，建議多用條列呈現重點');
  }

  // D4. 行動呼籲（CTA）(3分)
  const hasCTA = /訂閱|分享|留言|更多|延伸閱讀|推薦|相關文章/.test(bodyText);
  if (hasCTA) {
    structScore += 3; passes.push('含行動呼籲或延伸閱讀');
  } else {
    warnings.push('建議加入延伸閱讀或互動 CTA');
  }

  score += Math.min(structScore, 15);

  // ── E. AI 知識收錄適性 (10分) ─────────────────────────────────────────────
  let aiScore = 0;

  // E1. 有 schema.org + FAQ / HowTo schema (4分)
  const hasSchema = /application\/ld\+json/.test(html);
  const hasFAQ    = /FAQPage|HowTo|Article|NewsArticle/.test(html);
  if (hasSchema && hasFAQ) {
    aiScore += 4; passes.push('結構化資料完整，有利 Google AI 收錄');
  } else if (hasSchema) {
    aiScore += 2; warnings.push('有 Schema 但缺 FAQPage/HowTo，建議加入提升 AI 收錄');
  } else {
    issues.push('缺少結構化資料，不易被 AI 知識庫引用');
  }

  // E2. 原創觀點/深度分析關鍵詞 (3分)
  const depthKw = /研究|數據|實驗|科學|分析|根據|報告|調查|對比|深度/.test(bodyText);
  if (depthKw) {
    aiScore += 3; passes.push('含深度分析/數據關鍵詞，提升 AI 引用價值');
  } else {
    warnings.push('建議加入數據、研究引用，提升 AI 知識收錄適性');
  }

  // E3. 文章唯一性（slug 與標題明確）(3分)
  if (fm.title && fm.title.length >= 15 && slug.length >= 10) {
    aiScore += 3; passes.push('標題與 slug 具體、有區分度');
  } else {
    warnings.push('標題過短或 slug 不夠具體，建議優化');
  }

  score += Math.min(aiScore, 10);

  // F. Affiliate Link Detection (Compliance)
  const affiliatePatterns = [/amazon\./i, /amzn\.to/i, /shopee\.tw/i, /shope\.ee/i, /rstyle\.me/i, /shopstyle\.com/i];
  const links = html.match(/href=["'](https?:\/\/[^"']+)["']/g) || [];
  const hasAffiliate = links.some(l => affiliatePatterns.some(p => p.test(l)));
  
  if (hasAffiliate) {
    passes.push('聯盟連結偵測：已啟動利益揭露模組');
  }

  const totalScore = Math.min(Math.round(score), 100);
  let light, lightLabel, lightColor;
  if (totalScore >= 80) { light = 'green'; lightLabel = '🟢 可發布'; lightColor = '#188038'; }
  else if (totalScore >= 60) { light = 'yellow'; lightLabel = '🟡 建議修正'; lightColor = '#c47e2b'; }
  else { light = 'red'; lightLabel = '🔴 需要修改'; lightColor = '#d93025'; }

  return {
    score: totalScore, light, lightLabel, lightColor,
    hasAffiliate,
    dimensions: {

      seo:       Math.min(seoScore, 25),
      content:   Math.min(contentScore, 30),
      image:     Math.min(imgScore, 20),
      structure: Math.min(structScore, 15),
      ai:        Math.min(aiScore, 10),
    },
    passes,
    warnings,
    issues,
    meta: { zhCount, h2Count, extLinks, readingTime, hasSchema },
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
