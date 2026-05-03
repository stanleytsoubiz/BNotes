# BNotes Affiliate Block 技術規格 v1.0

建立日期：2026-05-03
負責人：B9 技術工程師
狀態：備戰完成，等待 Amazon Associates 帳號核准後執行

---

## 1. CSS 規格

### 1.1 `.affiliate-note` 元件樣式

```css
.affiliate-note {
  background: oklch(98% .015 45);
  border: 1px solid oklch(88% .04 45);
  border-left: 4px solid var(--gold, #c8922a);
  border-radius: .75rem;
  padding: 1rem 1.5rem;
  margin: 2rem 0;
  font-size: .95rem;
  line-height: 1.7;
}
.affiliate-note a {
  color: var(--coffee-mid, #8b4513);
  font-weight: 600;
  text-decoration: underline;
}
.affiliate-note::before {
  content: '☕ 器材推薦';
  display: block;
  font-size: .8rem;
  font-weight: 700;
  color: var(--gold, #c8922a);
  letter-spacing: .05em;
  margin-bottom: .5rem;
  text-transform: uppercase;
}
```

### 1.2 全站 CSS 加入位置

目前各文章以獨立 `<style>` 區塊管理樣式（位於 `<head>` 內）。

執行策略：
- **短期**：帳號開啟當天，將 `.affiliate-note` CSS 直接插入各目標文章的 `<style>` 區塊尾端。每篇文章獨立插入，不依賴全局 stylesheet（目前架構無共用 CSS 檔案）。
- **長期**：若未來建立 `/dist/css/global.css`，則將此元件移入，並從各文章 `<style>` 移除重複定義。

目標文章列表（含 affiliate block 需求）：
- `grinder-6models-comparison-2026.html`
- `espresso-parameters.html`
- `pour-over-guide.html`
- `grinder-guide-2026.html`
- `light-roast-beginners-guide.html`

---

## 2. HTML 結構模板

```html
<div class="affiliate-note">
  文中提到的 <a href="PLACEHOLDER_LINK" rel="noopener sponsored" target="_blank">器材名稱</a>
  在 Amazon 有販售，價格與庫存請點連結確認。透過此連結購買，BNotes 會收到少量佣金，
  不影響售價，也不影響本文的推薦立場。
</div>
```

插入位置規則（優先序）：
1. `geo-box` 區塊（FAQ 區塊）之前
2. 若無 `geo-box`，插入文章主體最後一個 `<h2>` 段落之後

---

## 3. 部署 SOP（帳號開啟後當天執行）

### 步驟 1：取得各文章的 PLACEHOLDER_LINK
從備戰清單（`BNotes_文章分級清單_v1.0.md` 或 B4 提供的 affiliate mapping）取得各文章對應器材品牌與型號。

### 步驟 2：產生 Amazon Associates 短連結
登入 Amazon Associates 後台，為每項器材建立短連結，格式：
```
https://www.amazon.co.jp/dp/[ASIN]?tag=bnotes-20
```
或使用 SiteStripe 工具產生帶 `tag=bnotes-20` 的連結。

### 步驟 3：附加 UTM 追蹤參數（見第 4 節）

### 步驟 4：用 Edit tool 插入 affiliate-note block
- 開啟各目標文章 HTML
- 在 `<style>` 區塊尾端插入 `.affiliate-note` CSS（若該文章尚未包含）
- 在指定插入位置插入 HTML 結構模板，替換 `PLACEHOLDER_LINK` 為實際連結

### 步驟 5：確認 `rel` 屬性
每個 affiliate 連結必須包含：
```html
rel="noopener sponsored"
```
`sponsored` 屬性為 Google 要求的 affiliate 連結聲明，遺漏視為 SEO 風險。

### 步驟 6：部署
```bash
git add dist/articles/[article-name].html
git commit -m "feat: add affiliate block to [article-name]"
git push origin main
```
Cloudflare Pages 自動觸發 CI/CD，部署完成後通知 B8 確認 GEO。

---

## 4. UTM 追蹤規格

每個 affiliate 連結需附加 UTM 參數，便於在 GA4 中區分各文章的 affiliate 流量：

```
?tag=bnotes-20&utm_source=bnotes&utm_medium=affiliate&utm_campaign=[article-slug]
```

完整範例（以 grinder-guide-2026 為例）：
```
https://www.amazon.co.jp/dp/B09XXXXX?tag=bnotes-20&utm_source=bnotes&utm_medium=affiliate&utm_campaign=grinder-guide-2026
```

各文章 `[article-slug]` 對應表：

| 文章 | article-slug |
|------|-------------|
| grinder-6models-comparison-2026.html | grinder-6models-2026 |
| espresso-parameters.html | espresso-parameters |
| pour-over-guide.html | pour-over-guide |
| grinder-guide-2026.html | grinder-guide-2026 |
| light-roast-beginners-guide.html | light-roast-beginners |

---

## 5. GA4 affiliate_click 事件確認

以下文章已實裝 `affiliate_click` 追蹤事件：

| 文章 | affiliate_click 事件 | GA4 存在 | Measurement ID |
|------|---------------------|---------|----------------|
| grinder-6models-comparison-2026.html | 已實裝 | 是 | G-2WXMBSHDSB |
| espresso-parameters.html | 已實裝 | 是 | G-2WXMBSHDSB |
| pour-over-guide.html | 未確認（需部署 affiliate block 後驗證） | 是 | G-2WXMBSHDSB |
| grinder-guide-2026.html | 已實裝 | 是 | G-2WXMBSHDSB |
| light-roast-beginners-guide.html | 未確認（需部署後驗證） | 是 | G-2WXMBSHDSB |

注意：`affiliate_click` 事件監聽器掛在 `.affiliate-note a` 點擊觸發，affiliate block 插入後需測試確認事件正常送出。

---

## 6. 驗收標準

部署完成後，B9 需確認：

- [ ] 各文章 `.affiliate-note` CSS 已加入 `<style>` 區塊
- [ ] affiliate-note HTML 結構插入正確位置
- [ ] 所有連結包含 `rel="noopener sponsored"`
- [ ] 所有連結帶有 `tag=bnotes-20` 及正確 UTM 參數
- [ ] GA4 DebugView 確認 `affiliate_click` 事件正常觸發
- [ ] 部署後通知 B8 GEO 確認、B6 社群分發

---

*文件版本：v1.0 | 建立：2026-05-03 | 下次更新：Amazon Associates 帳號核准後*
