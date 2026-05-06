---
document: amazon_affiliate_readiness
version: 1.0
prepared_by: B7 商業發展總監
date: 2026-05-06
status: 待帳號批准後立即部署
associate_tag_placeholder: "[ASSOCIATE_ID]"
---

# Amazon Associates TW 聯盟備戰文件

> **使用方式：** Amazon TW Associate ID 批准後，全文搜尋 `[ASSOCIATE_ID]` 替換為實際 Tag（格式範例：`bnotes-20`），即可完成所有模板部署。

---

## A｜高流量文章 × 相關產品對照表

共掃描確認 7 篇核心文章，涵蓋 4 大產品類別。

| # | 文章 slug | 文章主題 | 建議產品類別 | Amazon 搜尋關鍵字（繁中）| 預估轉換率 |
|---|-----------|----------|-------------|------------------------|----------|
| 1 | `grinder-guide-2026` | 2026 年度磨豆機推薦：從入門到專業完整評測 | 手搖磨豆機（入門）、手搖磨豆機（中高階）、磨豆機清潔錠 | `1Zpresso JX Pro S`、`Timemore C3 Pro`、`Urnex Grindz 磨豆機清潔錠` | 高 |
| 2 | `grinder-6models-comparison-2026` | 入門磨豆機六款橫向對比 NT$2,000–12,000 | 手搖磨豆機（入門）、電動磨豆機（中階）、磨豆機清潔錠 | `Timemore C3S Pro 磨豆機`、`Fellow Opus 磨豆機`、`Baratza Encore ESP` | 高 |
| 3 | `pour-over-guide` | 手沖咖啡完全指南：10 個關鍵步驟 | 手沖濾杯、細口手沖壺、電子秤 | `Hario V60 濾杯`、`Fellow Stagg EKG 手沖壺`、`Hario 計時電子秤` | 高 |
| 4 | `pour-over-variable-complete-experiment` | 手沖變數完整實驗：20 種配方 60 杯咖啡 | 電子秤（精密型）、折射計（TDS 測量）、手沖壺 | `VST 折射計`、`Acaia Pearl 電子秤`、`Timemore 手沖壺` | 中 |
| 5 | `espresso-parameters` | 義式咖啡萃取參數調整指南 | 義式填壓器、佈粉器、義式濃縮電子秤 | `Normcore 填壓器`、`Weiss Distribution Technique 佈粉器`、`Acaia Lunar 義式秤` | 中 |
| 6 | `latte-art` | 義式咖啡拉花藝術：心形到鬱金香完整教學 | 拉花奶壺、奶泡溫度計、拉花練習套組 | `拉花奶壺 500ml`、`咖啡奶泡溫度計`、`咖啡師拉花練習壺` | 中 |
| 7 | `home-coffee-corner` | 居家咖啡角佈置指南 | 咖啡豆密封罐、手搖磨豆機（入門）、手沖濾杯套組 | `Airscape 咖啡豆密封罐`、`Fellow Atmos 真空密封罐`、`Hario V60 手沖套組` | 高 |

**產品類別彙整（Amazon TW 搜尋頁直連備查）：**

| 產品類別 | 代表品牌 | Amazon TW 搜尋關鍵字 | 備註 |
|----------|----------|---------------------|------|
| 手搖磨豆機 | 1Zpresso、Timemore、Comandante | `1Zpresso JX Pro`、`Timemore C3` | 核心高轉換品類 |
| 電動磨豆機 | Baratza、Fellow、Eureka | `Baratza Encore`、`Fellow Opus` | 高客單價，佣金高 |
| 細口手沖壺 | Fellow Stagg、Timemore Fish | `Fellow Stagg EKG`、`Timemore 細口壺` | gear.html 已有連結 |
| 手沖濾杯 | Hario V60、Kalita Wave、OREA | `Hario V60 濾杯`、`Kalita Wave 155` | 低單價但高購買意願 |
| 電子秤 | Hario、Acaia、Timemore | `Hario 電子秤`、`Acaia Pearl` | 必買配件，轉換率高 |
| 咖啡豆密封罐 | Airscape、Fellow Atmos | `Airscape 密封罐`、`Fellow Atmos` | home-coffee-corner 天然切入點 |
| 義式填壓器 | Normcore、Barista Hustle | `Normcore 填壓器 58mm` | 義式文章支援品類 |
| 磨豆機清潔錠 | Urnex Grindz | `Urnex Grindz 清潔錠` | 低單價但轉換率高 |

---

## B｜聯盟連結 HTML 模板（三個場景）

### 模板 1：單品推薦（文章中段插入）

適用場景：文章行文中自然帶出一個具體產品，例如「建議入手 Hario V60」後即插入此區塊。

```html
<!-- BNotes 聯盟單品推薦 v1.0 — 文章中段 -->
<div style="
  background: linear-gradient(135deg, oklch(97% .02 45), oklch(95% .03 50));
  border: 1px solid oklch(88% .05 45);
  border-left: 4px solid #c8922a;
  border-radius: .75rem;
  padding: 1.2rem 1.4rem;
  margin: 1.8rem 0;
  font-family: var(--font-sans, 'Noto Sans TC', sans-serif);
">
  <p style="font-size: .78rem; font-weight: 700; color: #c8922a; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 .5rem;">編輯推薦器材</p>
  <p style="font-size: 1rem; font-weight: 700; color: #1a0a00; margin: 0 0 .4rem;">[產品名稱]</p>
  <p style="font-size: .88rem; color: #5a3e2b; line-height: 1.65; margin: 0 0 .9rem;">[一句話說明為何推薦，結合文章脈絡，例如：本文實測中 PSD 表現最均勻的入門手搖機]</p>
  <a href="https://www.amazon.com.tw/s?k=[KEYWORD]&tag=[ASSOCIATE_ID]"
     target="_blank" rel="noopener nofollow sponsored"
     onclick="if(window.gtag)gtag('event','affiliate_click',{'affiliate_product':'[PRODUCT_ID]','page_title':document.title,'link_url':this.href})"
     style="
       display: inline-block;
       background: #c8922a;
       color: white;
       padding: .55rem 1.1rem;
       border-radius: .45rem;
       font-size: .875rem;
       font-weight: 700;
       text-decoration: none;
     ">Amazon TW 查看價格 →</a>
  <p style="font-size: .72rem; color: #999; margin: .75rem 0 0; line-height: 1.5;">本連結為聯盟行銷連結，您透過連結購買時 BNotes 會獲得少量佣金，不影響您的價格。所有推薦均基於編輯獨立評測。</p>
</div>
```

**填入說明：**
- `[產品名稱]`：如 `1Zpresso JX Pro S 手搖磨豆機`
- `[KEYWORD]`：Amazon 搜尋詞，如 `1Zpresso+JX+Pro+S`
- `[ASSOCIATE_ID]`：帳號批准後填入，如 `bnotes-20`
- `[PRODUCT_ID]`：GA4 追蹤用識別碼，如 `amazon-1zpresso-jx`

---

### 模板 2：多品推薦（文章結尾延伸推薦區）

適用場景：文章結語之後、相關文章之前，列出 2–3 個相關產品。

```html
<!-- BNotes 聯盟多品推薦 v1.0 — 文章結尾 -->
<div style="
  background: white;
  border: 1px solid #e8d5b0;
  border-radius: .75rem;
  padding: 1.4rem;
  margin: 2rem auto;
  max-width: 740px;
  font-family: var(--font-sans, 'Noto Sans TC', sans-serif);
">
  <p style="font-size: .8rem; font-weight: 700; color: #c8922a; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 1rem; padding-bottom: .6rem; border-bottom: 1px solid #e8d5b0;">延伸推薦器材</p>
  <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .85rem;">

    <!-- 產品項目 1 -->
    <li style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 180px;">
        <p style="font-size: .9rem; font-weight: 700; color: #1a0a00; margin: 0 0 .25rem;">[產品名稱 1]</p>
        <p style="font-size: .82rem; color: #5a3e2b; margin: 0; line-height: 1.5;">[一句推薦理由]</p>
      </div>
      <a href="https://www.amazon.com.tw/s?k=[KEYWORD1]&tag=[ASSOCIATE_ID]"
         target="_blank" rel="noopener nofollow sponsored"
         onclick="if(window.gtag)gtag('event','affiliate_click',{'affiliate_product':'[PRODUCT_ID_1]','page_title':document.title,'link_url':this.href})"
         style="white-space: nowrap; background: #c8922a; color: white; padding: .45rem .9rem; border-radius: .4rem; font-size: .82rem; font-weight: 700; text-decoration: none;">Amazon 查看 →</a>
    </li>

    <!-- 產品項目 2 -->
    <li style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; padding-top: .85rem; border-top: 1px solid #f0e4cc;">
      <div style="flex: 1; min-width: 180px;">
        <p style="font-size: .9rem; font-weight: 700; color: #1a0a00; margin: 0 0 .25rem;">[產品名稱 2]</p>
        <p style="font-size: .82rem; color: #5a3e2b; margin: 0; line-height: 1.5;">[一句推薦理由]</p>
      </div>
      <a href="https://www.amazon.com.tw/s?k=[KEYWORD2]&tag=[ASSOCIATE_ID]"
         target="_blank" rel="noopener nofollow sponsored"
         onclick="if(window.gtag)gtag('event','affiliate_click',{'affiliate_product':'[PRODUCT_ID_2]','page_title':document.title,'link_url':this.href})"
         style="white-space: nowrap; background: #c8922a; color: white; padding: .45rem .9rem; border-radius: .4rem; font-size: .82rem; font-weight: 700; text-decoration: none;">Amazon 查看 →</a>
    </li>

    <!-- 產品項目 3（可選，移除此 li 即減為 2 品） -->
    <li style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; padding-top: .85rem; border-top: 1px solid #f0e4cc;">
      <div style="flex: 1; min-width: 180px;">
        <p style="font-size: .9rem; font-weight: 700; color: #1a0a00; margin: 0 0 .25rem;">[產品名稱 3]</p>
        <p style="font-size: .82rem; color: #5a3e2b; margin: 0; line-height: 1.5;">[一句推薦理由]</p>
      </div>
      <a href="https://www.amazon.com.tw/s?k=[KEYWORD3]&tag=[ASSOCIATE_ID]"
         target="_blank" rel="noopener nofollow sponsored"
         onclick="if(window.gtag)gtag('event','affiliate_click',{'affiliate_product':'[PRODUCT_ID_3]','page_title':document.title,'link_url':this.href})"
         style="white-space: nowrap; background: #c8922a; color: white; padding: .45rem .9rem; border-radius: .4rem; font-size: .82rem; font-weight: 700; text-decoration: none;">Amazon 查看 →</a>
    </li>

  </ul>
  <p style="font-size: .72rem; color: #999; margin: 1rem 0 0; padding-top: .75rem; border-top: 1px solid #e8d5b0; line-height: 1.5;">本區塊含聯盟行銷連結（Amazon Associates）。您透過連結購買時 BNotes 會獲得少量佣金，不影響您的價格。所有推薦均基於編輯獨立評測，BNotes 不接受廠商付費推薦。</p>
</div>
```

---

### 模板 3：比較推薦（「A vs B」類文章專用）

適用場景：`grinder-6models-comparison-2026` 這類橫向比較文章，在比較表格下方插入，直接對應表格中的每款產品。

```html
<!-- BNotes 聯盟比較推薦 v1.0 — 比較型文章專用 -->
<div style="
  background: #fdf6ec;
  border: 1px solid #e8d5b0;
  border-radius: .75rem;
  padding: 1.4rem;
  margin: 1.5rem auto;
  max-width: 740px;
  font-family: var(--font-sans, 'Noto Sans TC', sans-serif);
">
  <p style="font-size: .8rem; font-weight: 700; color: #c8922a; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 .9rem;">本文評測機型｜Amazon 購買連結</p>

  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: .75rem;">

    <!-- 評測機型 1 -->
    <div style="background: white; border: 1px solid #e8d5b0; border-radius: .6rem; padding: .9rem; display: flex; flex-direction: column; gap: .4rem;">
      <p style="font-size: .72rem; font-weight: 700; color: #c8922a; margin: 0;">編輯評分：[X/10]</p>
      <p style="font-size: .9rem; font-weight: 700; color: #1a0a00; margin: 0; line-height: 1.3;">[機型名稱 1]</p>
      <p style="font-size: .78rem; color: #5a3e2b; margin: 0; line-height: 1.5; flex: 1;">[一句核心評語，如：細粉率最低，入門首選]</p>
      <a href="https://www.amazon.com.tw/s?k=[KEYWORD1]&tag=[ASSOCIATE_ID]"
         target="_blank" rel="noopener nofollow sponsored"
         onclick="if(window.gtag)gtag('event','affiliate_click',{'affiliate_product':'[PRODUCT_ID_1]','page_title':document.title,'link_url':this.href})"
         style="display: block; text-align: center; background: #c8922a; color: white; padding: .5rem; border-radius: .4rem; font-size: .8rem; font-weight: 700; text-decoration: none; margin-top: .3rem;">Amazon 查看價格 →</a>
    </div>

    <!-- 評測機型 2 -->
    <div style="background: white; border: 1px solid #e8d5b0; border-radius: .6rem; padding: .9rem; display: flex; flex-direction: column; gap: .4rem;">
      <p style="font-size: .72rem; font-weight: 700; color: #c8922a; margin: 0;">編輯評分：[X/10]</p>
      <p style="font-size: .9rem; font-weight: 700; color: #1a0a00; margin: 0; line-height: 1.3;">[機型名稱 2]</p>
      <p style="font-size: .78rem; color: #5a3e2b; margin: 0; line-height: 1.5; flex: 1;">[一句核心評語]</p>
      <a href="https://www.amazon.com.tw/s?k=[KEYWORD2]&tag=[ASSOCIATE_ID]"
         target="_blank" rel="noopener nofollow sponsored"
         onclick="if(window.gtag)gtag('event','affiliate_click',{'affiliate_product':'[PRODUCT_ID_2]','page_title':document.title,'link_url':this.href})"
         style="display: block; text-align: center; background: #c8922a; color: white; padding: .5rem; border-radius: .4rem; font-size: .8rem; font-weight: 700; text-decoration: none; margin-top: .3rem;">Amazon 查看價格 →</a>
    </div>

    <!-- 評測機型 3 -->
    <div style="background: white; border: 1px solid #e8d5b0; border-radius: .6rem; padding: .9rem; display: flex; flex-direction: column; gap: .4rem;">
      <p style="font-size: .72rem; font-weight: 700; color: #c8922a; margin: 0;">編輯評分：[X/10]</p>
      <p style="font-size: .9rem; font-weight: 700; color: #1a0a00; margin: 0; line-height: 1.3;">[機型名稱 3]</p>
      <p style="font-size: .78rem; color: #5a3e2b; margin: 0; line-height: 1.5; flex: 1;">[一句核心評語]</p>
      <a href="https://www.amazon.com.tw/s?k=[KEYWORD3]&tag=[ASSOCIATE_ID]"
         target="_blank" rel="noopener nofollow sponsored"
         onclick="if(window.gtag)gtag('event','affiliate_click',{'affiliate_product':'[PRODUCT_ID_3]','page_title':document.title,'link_url':this.href})"
         style="display: block; text-align: center; background: #c8922a; color: white; padding: .5rem; border-radius: .4rem; font-size: .8rem; font-weight: 700; text-decoration: none; margin-top: .3rem;">Amazon 查看價格 →</a>
    </div>

  </div>

  <p style="font-size: .72rem; color: #999; margin: 1rem 0 0; line-height: 1.5;">本區塊含聯盟行銷連結（Amazon Associates）。您透過連結購買時 BNotes 會獲得少量佣金，不影響您的價格。所有推薦均基於編輯獨立評測，BNotes 不接受廠商付費推薦。</p>
</div>
```

---

## C｜部署優先順序清單（前 10 篇）

依「轉換潛力」排序，考量因素：讀者購買意圖強度 × 產品客單價 × 文章在搜尋漏斗中的位置。

| 優先序 | 文章 slug | 部署模板 | 推薦產品（優先搜尋詞） | 轉換邏輯 |
|--------|-----------|----------|----------------------|---------|
| 1 | `grinder-guide-2026` | 模板 1（中段）+ 模板 2（結尾） | Timemore C3S Pro、1Zpresso JX Pro S、Urnex Grindz | 讀者主動搜尋「磨豆機推薦」，購買意圖最強；文章有明確分級推薦表格，讀者到達決策終點。客單價 NT$2,000–6,000，Amazon TW 佣金約 3–5%。 |
| 2 | `grinder-6models-comparison-2026` | 模板 3（比較型） | 六款磨豆機各自的 Amazon 搜尋詞 | 橫向比較文章讀者已進入「選哪款」決策階段，比較表格下直接接比較推薦區塊，轉換路徑最短。 |
| 3 | `home-coffee-corner` | 模板 2（結尾，3 品） | Airscape 密封罐、Hario V60 套組、手動磨豆機入門款 | 「打造咖啡角」是「買清單型」需求，讀者會一次性購入多品，每件都有聯盟機會。密封罐客單價低（NT$800–1,500）但衝動購買率高。 |
| 4 | `pour-over-guide` | 模板 1（中段，濾杯章節後）+ 模板 2（結尾） | Hario V60 02 陶瓷、Fellow Stagg EKG、Hario 計時秤 | 手沖入門文流量大，讀者多為「想開始手沖」的新手，自然需要採購全套器材。已有 gear.html 連結支撐，此文作為流量入口補上直接轉換。 |
| 5 | `pour-over-variable-complete-experiment` | 模板 1（中段，電子秤章節後） | Acaia Pearl、VST Refractometer、Timemore 手沖壺 | 讀者為「已入門、想精進」的進階族，消費力更高，對 Acaia（NT$6,000+）或 VST 折射計（NT$5,000+）接受度強，客單價高。 |
| 6 | `espresso-parameters` | 模板 1（填壓器章節後）+ 模板 2（結尾） | Normcore 填壓器 58mm、Acaia Lunar 義式秤、佈粉器 | 義式調參文讀者幾乎都有義式機，升級「填壓器→佈粉器→電子秤」是自然的進化路徑，購買決策清晰。 |
| 7 | `latte-art` | 模板 2（結尾，2 品） | 拉花奶壺 600ml、咖啡奶泡溫度計 | 拉花文讀者有練習動機，奶壺（NT$500–1,000）和溫度計（NT$300）是低門檻衝動購買品，轉換率高雖客單價低。 |
| 8 | （下一批待補文章）`kalita-wave-review`（如存在） | 模板 1 | Kalita Wave 155、185 | 單款濾杯評測讀者購買意圖明確。 |
| 9 | （下一批待補文章）冷萃相關文章（如存在） | 模板 1 + 2 | Hario Mizudashi 冷水壺、冷萃壺 | 夏季搜尋量高，台灣市場需求明確。 |
| 10 | `gear.html`（精選器材頁） | 已有架構，補入缺漏產品的 Amazon 搜尋連結 | 各類別 Amazon 搜尋頁直連 | 器材頁是高意圖訪客的集散地，現有 5 張產品卡已有連結，補強「查看更多」類連結可提升每訪客佣金。 |

---

## D｜部署檢查清單（帳號批准後執行）

**Step 1：填入 Associate ID**
- 全文搜尋 `[ASSOCIATE_ID]`，替換為 Amazon TW 核發的 Associate Tag

**Step 2：確認合規**
- 每個聯盟連結 `<a>` 標籤必須包含 `rel="noopener nofollow sponsored"`
- 每個模板底部必須有 disclosure 聲明文字
- 不在 `<title>`、`<meta description>` 中提及「Amazon」（SEO 規範）

**Step 3：GA4 追蹤確認**
- `affiliate_click` 事件的 `onclick` 已嵌入各模板
- `affiliate_product` 參數值統一使用 `amazon-[product-slug]` 格式
- 部署後在 GA4 Realtime 驗證事件觸發

**Step 4：部署順序**
1. 先部署優先序 1（grinder-guide-2026），觀察 7 天 affiliate_click 數據
2. 確認 GA4 追蹤正常後，批量部署優先序 2–7
3. 每月第一週檢查 Amazon Associates 後台佣金報告

---

## E｜備注：現有 gear.html 連結盤點

`gear.html` 已有 `/re/` 短網址系統，目前使用蝦皮和 Amazon 混合：

| 產品 | 現有連結 | 狀態 |
|------|---------|------|
| Hario V60 陶瓷濾杯 | `/re/amazon-v60` | 已有 Amazon 路由，待填入 TW Associate Tag |
| Timemore C3（蝦皮） | `/re/shopee-grinder` | 蝦皮路由，帳號批准後評估是否並聯 Amazon |
| 1Zpresso JX Pro S | `/re/amazon-1zpresso-jx` | 已有 Amazon 路由，待填入 TW Associate Tag |
| Fellow Stagg EKG | `/re/amazon-fellow-stagg` | 已有 Amazon 路由，待填入 TW Associate Tag |
| Hario V60 計時電子秤 | `/re/amazon-hario-scale` | 已有 Amazon 路由，待填入 TW Associate Tag |

**結論：** `/re/` 路由系統已完整，Associate ID 批准後只需更新 Cloudflare Worker 中的實際 Amazon URL 加入 `tag=` 參數即可。

---

*B7 商業發展總監 — 2026-05-06 備戰完成*
