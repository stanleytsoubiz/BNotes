# BNotes Affiliate 備戰清單 v1.0

**建立日期：** 2026-05-03
**負責人：** B7 商業發展總監
**狀態：** 備戰完成，等待流量觸發

---

## Section 1：平台策略

### 1.1 蝦皮分潤（Shopee Affiliate）

**用途：** 現在申請，用於驗證點擊行為。蝦皮商品覆蓋台灣市場，點擊成本低，適合在流量規模化前建立基線數據。

**申請連結：** https://affiliate.shopee.tw/

**申請步驟：**
1. 前往上方連結，點擊「立即加入」
2. 以個人 Facebook 或 LINE 帳號，或直接以 email 註冊
3. 填寫推廣平台資訊：填入 https://bnotes.cafe 作為主要平台
4. 流量來源說明範例：「咖啡知識部落格，每月發布 4-6 篇器材評測與沖煮教學文章，讀者以台灣咖啡愛好者為主」
5. 審核通常 3-7 個工作天，Stan 本人持有申請資格
6. 核准後在蝦皮後台取得推薦連結，格式為 `https://shope.ee/xxxxxxx?smtt=xxxxxx`
7. 將連結更新至 `/re/` 短網址路由，對應本清單 Section 2 各文章的主推蝦皮產品

**驗證目標：** 申請核准後 30 天內，確認 GA4 `affiliate_click` 事件有蝦皮來源數據。

---

### 1.2 Amazon Associates

**用途：** 美系器材（Fellow、1Zpresso 國際版）覆蓋，佣金率較高（3–8%）。

**觸發條件（任一達成即可開帳號）：**
- 任意 3 篇高意圖文章（grinder-6models、grinder-guide-2026、pour-over-guide、espresso-parameters 為優先候選）合計月 UV 超過 500
- 或月全站 UV 達到 1,500

**觸發條件說明：** Amazon Associates 帳號核准後有 180 天考核期，期間需產生至少 3 筆合格銷售，否則帳號關閉。在流量不足時開帳號風險高，故設定前置條件。500 月 UV 是估算能產生 3 筆點擊轉換的最低門檻（假設 CTR 3%、轉換率 20%）。

**申請連結：** https://affiliate-program.amazon.com/

**申請注意事項：**
- 帳號申請填寫網站時填入 https://bnotes.cafe
- 流量描述：選擇「Blog / Review site」，月流量如實填寫
- 申請時建議同步提交 3 篇含有 Amazon 商品情境的文章作為審核佐證

---

### 1.3 平台選用原則

| 場景 | 優先平台 | 原因 |
|------|----------|------|
| 台灣本地購買（Timemore、Hario 台灣版） | 蝦皮分潤 | 台灣用戶習慣、結帳流程順暢 |
| 進口器材（Fellow Stagg EKG、1Zpresso 國際版） | Amazon Associates | 品項齊全、佣金結構較優 |
| BRITA、TDS 筆等日用品 | 蝦皮分潤 | 台灣通路覆蓋完整 |

---

## Section 2：10 篇文章 × 產品對照表

### 2.1 grinder-6models

**文章路徑：** `/grinder-6models.html`
**文章定性：** 高意圖比較型，讀者處於購買決策後段

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Timemore C3 | 1Zpresso JX-Pro |
| 台灣市場參考售價 | NT$2,000 | NT$4,500 |
| 推薦理由 | 文章驗證 C3 為最佳 CP 值入門機，自然結尾 | 進階讀者升級路徑，扭矩段感明顯優於 C3 |
| Amazon 搜尋關鍵字 | `Timemore C3 hand grinder` | `1Zpresso JX Pro hand grinder` |
| 蝦皮搜尋關鍵字 | `Timemore C3 磨豆機` | `1Zpresso JX-Pro` |

---

### 2.2 grinder-guide-2026

**文章路徑：** `/grinder-guide-2026.html`
**文章定性：** 手磨豆機選購指南，涵蓋多個價位段

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Timemore C3 | Timemore SLIM Pro |
| 台灣市場參考售價 | NT$2,000 | NT$3,200 |
| 推薦理由 | 入門段首選，文章比較表格的錨定商品 | 隨身攜帶場景，輕薄設計適合旅行者 |
| Amazon 搜尋關鍵字 | `Timemore C3 hand grinder` | `Timemore SLIM coffee grinder` |
| 蝦皮搜尋關鍵字 | `Timemore C3` | `Timemore SLIM Pro` |

---

### 2.3 espresso-parameters

**文章路徑：** `/espresso-parameters.html`
**文章定性：** 技術深度文，讀者為中階義式咖啡用戶

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Timemore 黑鏡 Basic 3 | Delonghi Dedica EC685 |
| 台灣市場參考售價 | NT$1,280 | NT$7,500 |
| 推薦理由 | 精準萃取必備工具，文章核心概念（克重比）直接對應 | 入門義式機門檻最低，文章讀者的典型設備 |
| Amazon 搜尋關鍵字 | `Timemore Black Mirror Basic 3 scale` | `Delonghi Dedica EC685` |
| 蝦皮搜尋關鍵字 | `Timemore 黑鏡 Basic 3` | `Delonghi Dedica EC685` |

---

### 2.4 pour-over-guide

**文章路徑：** `/pour-over-guide.html`
**文章定性：** 手沖入門完整指南，高廣度受眾

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Fellow Stagg EKG 細嘴壺 | Hario V60 套組 |
| 台灣市場參考售價 | NT$3,500–4,500 | NT$600–1,200 |
| 推薦理由 | 控溫與流量控制是手沖關鍵，EKG 是文章推薦的進階壺 | 最普及的手沖濾杯，適合剛入門的預算敏感讀者 |
| Amazon 搜尋關鍵字 | `Fellow Stagg EKG electric kettle` | `Hario V60 pour over starter set` |
| 蝦皮搜尋關鍵字 | `Fellow Stagg EKG` | `Hario V60 套組` |

---

### 2.5 home-coffee-corner

**文章路徑：** `/home-coffee-corner.html`
**文章定性：** 居家咖啡角落規劃，偏生活風格，轉換意圖中等

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Timemore C3 | Hario 冷泡壺 |
| 台灣市場參考售價 | NT$2,000 | NT$700–1,000 |
| 推薦理由 | 居家咖啡角落必備基礎設備，CP 值最高 | 夏季冷泡場景，低單價、衝動購買門檻低 |
| Amazon 搜尋關鍵字 | `Timemore C3 hand grinder` | `Hario cold brew bottle` |
| 蝦皮搜尋關鍵字 | `Timemore C3` | `Hario 冷泡壺` |

---

### 2.6 taiwan-coffee-equipment-midyear-2026

**文章路徑：** `/taiwan-coffee-equipment-midyear-2026.html`
**文章定性：** 年中推薦，季節性高意圖，適合購物節前後

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Timemore 黑鏡秤（Basic 3） | 1Zpresso JX-Pro |
| 台灣市場參考售價 | NT$1,280 | NT$4,500 |
| 推薦理由 | 年中推薦切入器材精準化升級需求，秤是最低摩擦入手品 | 進階磨豆機升級需求，年中折扣期購入時機佳 |
| Amazon 搜尋關鍵字 | `Timemore Black Mirror Basic scale` | `1Zpresso JX Pro hand grinder` |
| 蝦皮搜尋關鍵字 | `Timemore 黑鏡秤` | `1Zpresso JX-Pro` |

---

### 2.7 light-roast-beginners-guide

**文章路徑：** `/light-roast-beginners-guide.html`
**文章定性：** 淺焙入門，器材需求聚焦在手沖器材

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Hario V60 濾杯 | Fellow Stagg EKG 細嘴壺 |
| 台灣市場參考售價 | NT$600 | NT$3,500–4,500 |
| 推薦理由 | 淺焙最適萃取器材，文章入門建議首選，低門檻切入 | 溫控壺是萃取淺焙的進階關鍵，升級路徑清晰 |
| Amazon 搜尋關鍵字 | `Hario V60 dripper 02` | `Fellow Stagg EKG electric kettle` |
| 蝦皮搜尋關鍵字 | `Hario V60 濾杯` | `Fellow Stagg EKG` |

---

### 2.8 cold-brew-complete-101

**文章路徑：** `/cold-brew-complete-101.html`
**文章定性：** 冷泡完整教學，夏季高峰流量，轉換意圖明確

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Hario 冷泡壺 | Timemore C3 |
| 台灣市場參考售價 | NT$700–900 | NT$2,000 |
| 推薦理由 | 文章核心器材，讀者看完即有購買動機，轉換路徑最短 | 現磨咖啡粉提升冷泡品質，升級配件推薦 |
| Amazon 搜尋關鍵字 | `Hario Mizudashi cold brew pot` | `Timemore C3 hand grinder` |
| 蝦皮搜尋關鍵字 | `Hario 冷泡壺` | `Timemore C3` |

---

### 2.9 christmas-coffee-gift-guide-2026

**文章路徑：** `/christmas-coffee-gift-guide-2026.html`
**文章定性：** 禮品指南，季節性強，購買決策快，客單價較高

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | Timemore C3 禮盒版 | Fellow Stagg EKG 細嘴壺 |
| 台灣市場參考售價 | NT$2,000 起（禮盒版視組合而定） | NT$3,500–4,500 |
| 推薦理由 | 最具禮物感的入門器材，包裝完整，送禮零壓力 | 質感外型適合送禮，是送給進階咖啡愛好者的高分選項 |
| Amazon 搜尋關鍵字 | `Timemore C3 gift set coffee grinder` | `Fellow Stagg EKG kettle gift` |
| 蝦皮搜尋關鍵字 | `Timemore C3 禮盒` | `Fellow Stagg EKG` |

---

### 2.10 water-quality

**文章路徑：** `/water-quality.html`
**文章定性：** 知識延伸型，受眾為追求萃取精準的進階用戶

| 欄位 | 主推產品 | 備推產品 |
|------|----------|----------|
| 品牌 + 型號 | BRITA 濾水壺（Marella 系列） | TDS 筆（任一品牌） |
| 台灣市場參考售價 | NT$800–1,200 | NT$200–400 |
| 推薦理由 | 文章論證水質直接影響咖啡風味，BRITA 是最低阻力的行動方案 | TDS 筆為文章核心測量工具，低單價衝動購買品 |
| Amazon 搜尋關鍵字 | `BRITA Marella water filter pitcher` | `TDS meter water quality tester` |
| 蝦皮搜尋關鍵字 | `BRITA 濾水壺` | `TDS 水質筆` |

---

## Section 3：開帳號 SOP（Amazon Associates）

當觸發條件達成後，帳號核准當天依序執行以下步驟。

**前置確認：** 在執行前先讀取 GA4 `affiliate_click` 事件數據，確認哪 3 篇文章的點擊量最高，優先為這 3 篇更新 Amazon 連結。

---

**Step 1 取得各產品 ASIN**

登入 Amazon Associates 後台（https://affiliate-program.amazon.com/），使用「Product Linking > Product Search」功能。

依 Section 2 各文章的「Amazon 搜尋關鍵字」逐一搜尋，確認商品後記錄 ASIN（10 碼，格式如 `B08XXXXXXXX`）。

優先取得以下 7 個核心商品的 ASIN：

| 商品 | Amazon 搜尋關鍵字 |
|------|-------------------|
| Timemore C3 | `Timemore C3 hand grinder` |
| 1Zpresso JX-Pro | `1Zpresso JX Pro hand grinder` |
| Timemore 黑鏡 Basic 3 | `Timemore Black Mirror Basic 3 scale` |
| Fellow Stagg EKG | `Fellow Stagg EKG electric kettle` |
| Hario V60 套組 | `Hario V60 pour over starter set` |
| Hario 冷泡壺 | `Hario Mizudashi cold brew pot` |
| BRITA 濾水壺 | `BRITA Marella water filter pitcher` |

---

**Step 2 產生帶 bnotes-20 tag 的短連結**

在 Associates 後台使用「Product Linking > SiteStripe」或手動組合連結格式：

```
https://www.amazon.com/dp/{ASIN}/?tag=bnotes-20
```

每個商品產生一條完整連結，存入本文件 Section 2 對應欄位（更新版本為 v1.1）。

---

**Step 3 替換清單中的暫用連結**

目前 gear.html 與各文章聯盟區塊使用的是蝦皮連結或暫用佔位符。

確認 Amazon 連結生效後，按以下優先序替換：

1. `/grinder-6models.html` — Timemore C3 + 1Zpresso JX-Pro
2. `/grinder-guide-2026.html` — Timemore C3 + Timemore SLIM Pro
3. `/pour-over-guide.html` — Fellow Stagg EKG + Hario V60
4. `/gear.html` — 所有 5 張產品卡

替換原則：蝦皮連結保留作為第二選項（「台灣蝦皮購買」按鈕），Amazon 連結作為主要 CTA。

---

**Step 4 B9 部署 HTML block**

將更新後的聯盟連結區塊交付 B9（技術 / UX / UI）執行部署。

B9 部署清單：
- 更新 `/gear.html` 產品卡的 href 屬性
- 更新各文章 HTML 的聯盟按鈕連結
- 確認 `/re/` 短網址路由指向新連結
- 驗證 GA4 `affiliate_click` 事件在更新後仍正常觸發
- 部署完成後回報 B7 確認

---

**Step 5 核准後 30 天追蹤**

在 Google Analytics 與 Amazon Associates 後台同步追蹤：

- GA4：`affiliate_click` 事件按 `link_url` 維度分組，觀察 Amazon vs 蝦皮點擊比例
- Amazon 後台：確認 180 天考核期內已累積 3 筆合格銷售
- 若 60 天內無合格銷售，啟動「提高 CTR 行動方案」（在 grinder-6models 文章比較表格中加入明確的 Amazon 購買按鈕）

---

## Section 4：版本紀錄

| 版本 | 日期 | 狀態 | 主要變動 |
|------|------|------|----------|
| v1.0 | 2026-05-03 | 備戰完成，等待流量觸發 | 初始建立：平台策略、10 篇文章產品對照、Amazon 開帳號 SOP |

**下一版本觸發條件：**
- v1.1：Amazon Associates 帳號核准，補入各商品 ASIN 與正式連結
- v1.2：蝦皮分潤帳號核准，補入蝦皮正式推薦連結
- v2.0：月 UV 達 3,000，B7 重新啟動，進行全面聯盟佈局優化

---

*本文件由 B7 商業發展總監建立，隸屬 BNotes 策略文件庫。執行前請確認符合 BNotes 鐵律：所有變現通過「是否違反免費原則」檢查，知識本體永遠免費。*
