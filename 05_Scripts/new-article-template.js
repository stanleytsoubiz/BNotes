#!/usr/bin/env node
/**
 * BNotes new-article-template.js — B3/GM 文章骨架產生器 v1.0
 *
 * 用法：node new-article-template.js <slug> [options]
 *
 * Options (可 --key=value 或 --key "value"):
 *   --title    文章標題（必填）
 *   --cat      分類：沖泡科學|產地風土|烘焙工藝|器材評測|咖啡文化  (default: 沖泡科學)
 *   --desc     Meta description，≤80 中文字  (必填)
 *   --date     發布日期 YYYY-MM-DD  (default: today)
 *   --author   作者名  (default: BNotes 編輯室)
 *   --tags     逗號分隔關鍵字  (default: 咖啡,精品咖啡)
 *   --prompt   Imagen 4 hero image prompt (≥25 words 英文)
 *
 * 輸出：08_文章_Articles_HTML/<slug>.html（v1.5 九元素骨架）
 *
 * 九元素結構：
 *   1. 場景式開頭段落
 *   2. 摘要框 .bnotes-cover
 *   3. H2 正文區塊
 *   4. geo-box（產地類文章）或 science-box（技術類）
 *   5. references block
 *   6. affiliate 推薦連結
 *   7. further-reading 延伸閱讀
 *   8. 場景式結語
 *   9. Share section
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const DRAFTS = path.join(ROOT, '08_文章_Articles_HTML');

// ── 解析 CLI 參數 ──────────────────────────────────────────
const args = process.argv.slice(2);
const slug = args[0];

if (!slug || slug.startsWith('--')) {
  console.error('❌  用法：node new-article-template.js <slug> [--title "..."] [--cat "..."] ...');
  process.exit(1);
}

const opts = {};
for (let i = 1; i < args.length; i++) {
  const m = args[i].match(/^--(\w+)(?:=(.+))?$/);
  if (m) {
    opts[m[1]] = m[2] !== undefined ? m[2] : (args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : '');
  }
}

const title  = opts.title  || `【TODO】${slug} 文章標題`;
const cat    = opts.cat    || '沖泡科學';
const desc   = opts.desc   || `【TODO】${title.substring(0, 40)} — BNotes 深度解析`;
const date   = opts.date   || new Date().toISOString().substring(0, 10);
const author = opts.author || 'BNotes 編輯室';
const tags   = opts.tags   || '咖啡,精品咖啡';
const prompt = opts.prompt || `TODO: Add 25+ word Imagen 4 prompt for ${slug} — describe equipment/origin/mood/photographic style in English`;

// ── 分類對應 emoji 與顏色 ──────────────────────────────────
const catConfig = {
  '沖泡科學': { emoji: '🔬', color: '#2563eb' },
  '產地風土': { emoji: '🌍', color: '#16a34a' },
  '烘焙工藝': { emoji: '🔥', color: '#dc2626' },
  '器材評測': { emoji: '⚙️',  color: '#7c3aed' },
  '咖啡文化': { emoji: '☕', color: '#d97706' },
};
const catEmoji = catConfig[cat]?.emoji || '☕';
const catColor = catConfig[cat]?.color || '#d97706';

// 取第一個 tag 作為主關鍵字
const primaryKw = tags.split(',')[0].trim();

// ── Hero image path ────────────────────────────────────────
const heroImg = `/images/ai/${slug}-hero.jpg`;

// ── 產生骨架 HTML ──────────────────────────────────────────
const html = `<!--
title  : ${title}
date   : ${date}
cat    : ${cat}
desc   : ${desc}
author : ${author}
tags   : ${tags}
status : draft
hero_prompt: ${prompt}
-->
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | BNotes 咖啡知識庫</title>
  <meta name="description" content="${desc}">
  <meta name="author" content="${author}">
  <meta name="keywords" content="${tags}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="https://bnotescoffee.com${heroImg}">
  <meta property="og:url" content="https://bnotescoffee.com/articles/${slug}">
  <meta property="og:type" content="article">
  <meta property="article:published_time" content="${date}T08:00:00+08:00">
  <meta property="article:author" content="${author}">
  <meta property="article:section" content="${cat}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://bnotescoffee.com/articles/${slug}">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${title}",
    "description": "${desc}",
    "image": "https://bnotescoffee.com${heroImg}",
    "datePublished": "${date}T08:00:00+08:00",
    "dateModified": "${date}T08:00:00+08:00",
    "author": {"@type": "Organization", "name": "${author}"},
    "publisher": {
      "@type": "Organization",
      "name": "BNotes 咖啡知識庫",
      "logo": {"@type": "ImageObject", "url": "https://bnotescoffee.com/images/logo.png"}
    },
    "mainEntityOfPage": {"@type": "WebPage", "@id": "https://bnotescoffee.com/articles/${slug}"}
  }
  </script>
</head>
<body>
  <!-- NAV: 由 layout inject，此處保留 placeholder -->
  <nav class="site-nav" id="site-nav">
    <a href="/" class="nav-logo">BNotes</a>
    <ul class="nav-links">
      <li><a href="/">首頁</a></li>
      <li><a href="/gear.html">器材</a></li>
    </ul>
  </nav>

  <main class="article-main">
    <article class="article-body" itemscope itemtype="https://schema.org/NewsArticle">

      <!-- ══ HERO IMAGE ══════════════════════════════════════ -->
      <div class="article-hero">
        <img src="${heroImg}"
             data-fallback="/images/ai/alishan-new-crop-w02-hero.jpg"
             alt="${title}"
             loading="eager"
             width="1200" height="630"
             itemprop="image">
      </div>

      <!-- ══ HEADER ══════════════════════════════════════════ -->
      <header class="article-header">
        <div class="article-meta">
          <span class="article-cat" style="background:${catColor}">${catEmoji} ${cat}</span>
          <time datetime="${date}" itemprop="datePublished">${date}</time>
          <span itemprop="author">${author}</span>
        </div>
        <h1 class="article-title" itemprop="headline">${title}</h1>
        <p class="article-desc" itemprop="description">${desc}</p>
      </header>

      <!-- ══ 元素 1：場景式開頭 ══════════════════════════════ -->
      <!--
        編輯五律 #1：場景開頭，不是數據，是畫面或第一人稱經驗
        編輯五律 #2：感官優先，先讓讀者聞到/感受到
        禁律：農場文 / AI 味（綜合而言/眾所周知）/ 學術腔開頭
      -->
      <section class="article-intro">
        <p>【TODO：場景式開頭 — 用一個畫面或第一人稱經驗開場。例如：某個午後、某次沖泡的瞬間、某個讓你停下來的感官細節。3–5 句，有畫面感，有感官。不要數據開場，不要定義句開場。】</p>
      </section>

      <!-- ══ 元素 2：摘要框 .bnotes-cover ═══════════════════ -->
      <div class="bnotes-cover">
        <h2 class="cover-title">本文重點</h2>
        <ul class="cover-list">
          <li>【TODO：重點 1，用讀者最想知道的問題切入】</li>
          <li>【TODO：重點 2】</li>
          <li>【TODO：重點 3】</li>
          <li>【TODO：重點 4（可選）】</li>
        </ul>
        <p class="cover-note">📖 閱讀時間約 X 分鐘 ｜適合：【TODO：目標讀者描述，例如「剛接觸手沖的新手」或「想升級器材的咖啡迷」】</p>
      </div>

      <!-- ══ 元素 3：H2 正文區塊 ════════════════════════════ -->
      <!--
        編輯五律 #3：術語雙軌，術語首次出現必附人話翻譯
        編輯五律 #4：節奏呼吸，3–5 句一段，長句後接短句
        編輯五律 #5：作者在場，至少一句「我」的視角
      -->
      <section class="article-content">

        <h2>【TODO：第一個 H2 標題 — 通常是「什麼是 X」或「為何 X 重要」】</h2>
        <p>【TODO：開場段落，引入主題。3–5 句。含術語時，格式：術語（人話翻譯）例如「萃取率（咖啡粉中可溶物質被熱水帶走的比例）」】</p>
        <p>【TODO：延伸段落。可加入數據或研究，但要先有感官/故事，再有數字。】</p>

        <h2>【TODO：第二個 H2 標題 — 通常是核心機制或步驟】</h2>
        <p>【TODO：段落內容。記得：3–5 句一段，長句後接短句。】</p>
        <p>【TODO：可用有序列表說明步驟：】</p>
        <ol>
          <li>【TODO：步驟一】</li>
          <li>【TODO：步驟二】</li>
          <li>【TODO：步驟三】</li>
        </ol>

        <h2>【TODO：第三個 H2 標題 — 深度分析或常見誤解】</h2>
        <p>【TODO：段落內容。至少一句作者在場：「我自己試過...」「在我沖的幾百杯裡...」「我建議...」】</p>
        <p>【TODO：可加小結段落，呼應開頭的畫面。】</p>

        <!-- 視文章需求增加 H2 區塊 -->

      </section>

      <!-- ══ 元素 4：geo-box 或 science-box ════════════════ -->
      <!--
        產地類文章用 geo-box，技術/科學類用 science-box
        刪除不用的那個
      -->
      <div class="geo-box">
        <h3 class="geo-title">🌍 產地快覽</h3>
        <dl class="geo-data">
          <dt>產區</dt><dd>【TODO：產區名稱】</dd>
          <dt>海拔</dt><dd>【TODO：海拔範圍】</dd>
          <dt>處理法</dt><dd>【TODO：水洗 / 日曬 / 蜜處理】</dd>
          <dt>風味基調</dt><dd>【TODO：2–3 個風味描述詞】</dd>
          <dt>建議沖煮</dt><dd>【TODO：手沖 / 義式等】</dd>
        </dl>
      </div>

      <div class="science-box" style="display:none"><!-- 刪除 display:none 啟用 -->
        <h3 class="science-title">🔬 科學速查</h3>
        <dl class="science-data">
          <dt>關鍵變數</dt><dd>【TODO】</dd>
          <dt>建議數值</dt><dd>【TODO】</dd>
          <dt>影響結果</dt><dd>【TODO】</dd>
          <dt>SCA 標準</dt><dd>【TODO（若有）】</dd>
        </dl>
      </div>

      <!-- ══ 元素 5：references ═══════════════════════════ -->
      <section class="references">
        <h3>參考資料</h3>
        <ol class="reference-list">
          <li>【TODO：來源 1 — 格式：作者（年份）。〈標題〉。出版物名稱。URL（若有）】</li>
          <li>【TODO：來源 2】</li>
          <li>【TODO：來源 3（至少 3 個可信來源）】</li>
        </ol>
      </section>

      <!-- ══ 元素 6：affiliate 推薦連結 ════════════════════ -->
      <!--
        每篇文章至少 3 個推薦連結（Amazon Associates / momo / PChome）
        格式：rel="noopener sponsored"
      -->
      <section class="affiliate-section">
        <h3 class="affiliate-title">延伸購買 / 推薦器材</h3>
        <div class="affiliate-grid">
          <a href="【TODO：聯盟連結 1】" rel="noopener sponsored" target="_blank" class="affiliate-card">
            <img src="/images/affiliate/${slug}-rec-1.jpg" alt="【TODO：產品名稱 1】" loading="lazy"
                 onerror="this.style.display='none'">
            <div class="affiliate-info">
              <span class="affiliate-name">【TODO：產品名稱 1】</span>
              <span class="affiliate-note">【TODO：一句推薦理由】</span>
            </div>
          </a>
          <a href="【TODO：聯盟連結 2】" rel="noopener sponsored" target="_blank" class="affiliate-card">
            <div class="affiliate-info">
              <span class="affiliate-name">【TODO：產品名稱 2】</span>
              <span class="affiliate-note">【TODO：一句推薦理由】</span>
            </div>
          </a>
          <a href="【TODO：聯盟連結 3】" rel="noopener sponsored" target="_blank" class="affiliate-card">
            <div class="affiliate-info">
              <span class="affiliate-name">【TODO：產品名稱 3】</span>
              <span class="affiliate-note">【TODO：一句推薦理由】</span>
            </div>
          </a>
        </div>
        <p class="affiliate-disclaimer">＊ 以上為聯盟推薦連結，您點擊後購買，BNotes 將獲得小額回饋，不影響您的售價。我們只推薦自己用過或深度研究過的產品。</p>
      </section>

      <!-- ══ 元素 7：further-reading 延伸閱讀 ══════════════ -->
      <section class="further-reading">
        <h3>延伸閱讀</h3>
        <ul class="reading-list">
          <li><a href="/articles/【TODO：相關文章 slug 1】.html">【TODO：相關文章標題 1】</a></li>
          <li><a href="/articles/【TODO：相關文章 slug 2】.html">【TODO：相關文章標題 2】</a></li>
          <li><a href="/articles/【TODO：相關文章 slug 3】.html">【TODO：相關文章標題 3】</a></li>
        </ul>
      </section>

      <!-- ══ 元素 8：場景式結語 ══════════════════════════════ -->
      <!--
        編輯五律：結尾是畫面或邀請，不是結論摘要
        禁律：「總結來說」「希望本文對您有所幫助」類的農場文結語
      -->
      <section class="article-outro">
        <p>【TODO：場景式結語 — 回到開頭的畫面，或給讀者一個今天就能做的邀請。例如：「下次你拿起手沖壺的時候，不妨...」或用一個當下的畫面收尾。不要用「總結」「希望」開頭。3–5 句。】</p>
      </section>

      <!-- ══ 元素 9：Share section ═══════════════════════════ -->
      <section class="share-section">
        <p class="share-text">覺得有幫助？分享給同樣愛咖啡的朋友 ☕</p>
        <div class="share-buttons">
          <a href="https://www.facebook.com/sharer/sharer.php?u=https://bnotescoffee.com/articles/${slug}"
             rel="noopener" target="_blank" class="share-btn share-fb">Facebook</a>
          <a href="https://twitter.com/intent/tweet?url=https://bnotescoffee.com/articles/${slug}&text=${encodeURIComponent(title)}"
             rel="noopener" target="_blank" class="share-btn share-tw">Twitter</a>
          <a href="https://line.me/R/msg/text/?${encodeURIComponent(title + ' ' + 'https://bnotescoffee.com/articles/' + slug)}"
             rel="noopener" target="_blank" class="share-btn share-line">LINE</a>
        </div>
      </section>

    </article>
  </main>

  <footer class="site-footer">
    <p>© 2026 BNotes 咖啡知識庫 ｜ <a href="/">回首頁</a> ｜ <a href="/gear.html">器材推薦</a></p>
  </footer>

  <script src="/app.js" defer></script>
</body>
</html>
`;

// ── 寫入 ───────────────────────────────────────────────────
if (!fs.existsSync(DRAFTS)) fs.mkdirSync(DRAFTS, { recursive: true });

const outPath = path.join(DRAFTS, `${slug}.html`);
if (fs.existsSync(outPath)) {
  console.error(`❌  草稿已存在：${outPath}`);
  console.error(`    請先刪除或改用不同 slug`);
  process.exit(1);
}

fs.writeFileSync(outPath, html, 'utf8');

console.log(`\n✅  骨架已建立：08_文章_Articles_HTML/${slug}.html`);
console.log(`\n📋  TODO 清單（共需補完）：`);
console.log(`    1. 場景式開頭（元素 1）`);
console.log(`    2. 摘要框重點（元素 2）`);
console.log(`    3. H2 正文段落（元素 3）— 至少 3 個 H2`);
console.log(`    4. geo-box 或 science-box 資料（元素 4）`);
console.log(`    5. references 來源（元素 5，≥3 條）`);
console.log(`    6. affiliate 連結（元素 6，≥3 個）`);
console.log(`    7. further-reading slug（元素 7）`);
console.log(`    8. 場景式結語（元素 8）`);
console.log(`    9. （Share section 已自動生成，無需手改）`);
console.log(`\n🖼️   Hero 圖片 prompt（待 generate-hero-image.js 處理）：`);
console.log(`    ${prompt}`);
console.log(`\n🔜  下一步：`);
console.log(`    1. 填寫所有 【TODO】`);
console.log(`    2. node 05_Scripts/generate-hero-image.js ${slug}`);
console.log(`    3. node 05_Scripts/publish.js ${slug}\n`);
