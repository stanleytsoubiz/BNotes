# BNotes GEO 引用基準報告 v1.0

> **產出者：** PGM（依 CEO 戰略指令二）
> **產出日期：** 2026-05-06
> **目的：** 建立 BNotes 對 Google + AI 引擎可見性的首次量化基準，供未來月對月對比
> **方法：** 15 關鍵字 × WebSearch `site:bnotescoffee.com` + 自然搜尋雙軌測試

---

## 一、執行摘要（核心結論）

| 指標 | 結果 |
|------|------|
| sitemap 收錄文章總數 | 71 篇（2026-05-04 lastmod） |
| 15 關鍵字中至少回傳一筆 BNotes 結果 | **9 / 15（60%）** |
| 15 關鍵字中精準命中對應主題文章 | **2 / 15（13%）** |
| 15 關鍵字中完全 0 結果 | **6 / 15（40%）** |
| 自然搜尋（無 site: 限制）出現 BNotes | **0 / 1 抽測**（手沖水溫測試完全被競品壟斷） |

**根本診斷：**
- Google 已索引文章（與 2026-05-06 董事會 feed.xml 索引事件一致：69 頁已索引、90 次點擊）
- **但 Google 演算法在主流關鍵字上仍以競品（Buon Caffe、Simple Kaffa、湛盧、林桑、cometrue 等）為主**，BNotes 排名未進前 10
- 高頻被命中的兩篇：`coffee-dessert-pairing-science` 與 `sca-tasting-vocabulary-guide`——這兩篇是 BNotes 目前對 Google 而言「最有信號」的文章，多次以非主題身份被代回
- **核心問題不是「沒被索引」，而是「索引品質低、主題對應錯誤」**——BNotes 在主流核心關鍵字上沒有「最佳答案」訊號

---

## 二、15 關鍵字測試結果

| # | 關鍵字 | site: 收錄 | BNotes 對應文章存在於 sitemap？ | 精準命中？ | 備註 |
|---|--------|-----------|-------------------------------|-----------|------|
| 1 | 義式咖啡萃取比例 | Y（3 篇代回） | Y（espresso-ratio-science）| **N** | 主題文章未代回，命中錯誤 |
| 2 | 手沖咖啡水溫 | Y（1 篇代回） | Y（pour-over-water-temperature-guide）| **N** | 主題文章未代回 |
| 3 | 咖啡豆烘焙度 | Y（2 篇代回） | Y（roast-level-guide / light-roast-beginners-guide）| **N** | 主題文章未代回 |
| 4 | 衣索比亞咖啡風味 | Y（2 篇代回） | Y（ethiopia-natural-process-deep-dive）| **N** | 主題文章未代回 |
| 5 | 冷萃咖啡 | Y（2 篇代回） | Y（cold-brew-complete-101 / cold-brew-advanced-science）| **N** | 主題文章未代回 |
| 6 | 磨豆機推薦 | **N** | Y（grinder-6models-comparison-2026 / grinder-guide-2026）| — | **0 結果** |
| 7 | 咖啡水質 | Y（2 篇代回） | Y（water-quality）| **N** | 主題文章未代回 |
| 8 | 拉花 | **N** | Y（latte-art / wlac-2026-champion-technique）| — | **0 結果** |
| 9 | 單品咖啡產地 | Y（2 篇代回） | 部分（single-origin-terroir-science）| 部分 | terroir-guide pillar 命中 |
| 10 | 處理法 | **N** | Y（processing-methods）| — | **0 結果** |
| 11 | SCA 標準 | Y（2 篇代回） | 無專文 | Y | sca-tasting-vocabulary-guide 命中 |
| 12 | 萃取過度 | **N** | 無專文 | — | **0 結果**（內容缺口）|
| 13 | 台灣咖啡產區 | Y（1 篇代回，pillar 命中）| Y（taiwan-coffee-terroir-guide）| **Y** | 唯一精準命中 |
| 14 | Bala 拉花冠軍 | **N** | 無專文（WLAC 2026 文章不含 Bala 名）| — | **0 結果**（內容缺口）|
| 15 | 濾紙 | **N** | 無專文（v60-vs-kalita 含但未獨立）| — | **0 結果**（內容缺口）|
| 補 16 | 咖啡萃取比例 | Y（3 篇代回，含 terroir 引用 1:15-1:16 數字）| 部分 | 部分 | terroir 反而成為「萃取比例」答案來源 |

**總結：**
- **9 個關鍵字有收錄結果但全為錯誤代回**（用 dessert-pairing / sca-vocab / terroir-pillar 三篇代答其他主題）
- **6 個關鍵字完全 0 結果**（包括磨豆機推薦、拉花、處理法、萃取過度、Bala、濾紙）—— Google 完全找不到 BNotes 的對應內容
- **唯一精準命中：** 台灣咖啡產區 → terroir-guide pillar 頁（Y）

---

## 三、洞察與根因分析（PGM 審視）

### 洞察 1：「替身文章」現象
`coffee-dessert-pairing-science` + `sca-tasting-vocabulary-guide` + `taiwan-coffee-terroir-guide`（pillar）這三篇被反覆代回，原因可能是：
- 內容覆蓋面廣（提到了多種主題的關鍵詞）
- 內部連結與權威信號相對較強
- **但這也意味著 Google 認為 BNotes 的其他 60 篇主題文章「信號不夠強」**

### 洞察 2：核心商業關鍵字 0 結果（最嚴重）
「磨豆機推薦」「拉花」「濾紙」「處理法」——這四個是聯盟商務（B7）變現潛力最高的關鍵字，全部 0 結果。即使文章存在於 sitemap，Google 完全沒選擇代回。

### 洞察 3：缺乏「Bala」這類熱門人物導流入口
2026 WLAC 冠軍 Bala 是台灣熱門搜尋詞，現有 `wlac-2026-champion-technique` 文章在 sitemap 中但搜尋時 0 結果。這表示文章 Schema/H1/keyword 沒有以「Bala」為核心。

### 洞察 4：兩個內容缺口
- **萃取過度 over-extraction：** 全站無專文，這是「沖煮診斷」的剛需題目
- **濾紙選擇：** 有提到但無專文，是新手入門剛需題

---

## 四、三項建議行動（PGM 建議，待 CEO 核定）

### 行動 1：優先修補 6 個 0 結果的高商業價值關鍵字（最高 ROI）
針對「磨豆機推薦」「拉花」「處理法」這三個有現存文章的關鍵字，立即由 B9 檢查：
- H1 / meta description 是否含核心關鍵字
- Schema markup 是否完整
- 內部連結是否從高權重文章（dessert-pairing / sca-vocab / terroir-pillar）指向

### 行動 2：補足兩個內容缺口（B4 立刻啟動選題）
- **萃取過度症狀完整指南**（沖煮診斷剛需）
- **濾紙選擇科學**（V60 / Kalita / Hario / 漂白未漂白比較）

### 行動 3：Bala 主題文章獨立化
建議將 `wlac-2026-champion-technique` 拆出 Bala 個人技術剖析專文，slug 包含「bala」名字，做為熱門人物導流入口。

---

## 五、下次測試節奏建議

每月 1 號重跑此 15 關鍵字測試，對比指標：
- 精準命中率（目前 13%，目標 6 月 ≥ 30%、9 月 ≥ 50%）
- 0 結果關鍵字數量（目前 6/15，目標 6 月 ≤ 3/15）
- 自然搜尋（無 site:）BNotes 出現次數（目前 0，目標 6 月 ≥ 1）

---

**附註：** GA4 腳本（`05_Scripts/analytics/ga4_report.py`）因 Bash sandbox 限制無法在本 Session 直接執行。建議下個 Session 由 CEO 在獨立終端執行 `bash run_report.sh weekly` 取得真實 pageview 數據，與此 GEO 報告交叉比對。

**版本紀錄：**
| v1.0 | 2026-05-06 | PGM 首版基準，依 CEO 戰略指令二建立 |
