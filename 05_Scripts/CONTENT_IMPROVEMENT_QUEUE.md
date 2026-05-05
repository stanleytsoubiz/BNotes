# BNotes 內容改善佇列
**建立時間：** 2026-05-04
**最後更新：** 2026-05-04（CEO→GM 交接）
**負責人：** GM × B3 × B9
**節奏：** 每週 3 篇（B3 排程）

---

## A 隊列：紅燈已修復（W19 完成）

| Slug | 問題 | 修復方式 | 狀態 |
|------|------|---------|------|
| `taiwan-coffee-equipment-midyear-2026` | 3 個範本骨架 H2（器具介紹/操作步驟/風味調整）+ 內容單薄 | GM 重命名 H2 為「測評方法論」「三類器具選購邏輯」並補完介紹段落 | 已修復 |
| `v60-vs-kalita-filter-geometry` | 4 個 H2 中 3 個錯位機械骨架 | GM 刪除冗餘 H2，將「操作步驟詳解」改為「V60 vs Kalita Wave：規格與沖煮哲學對照」 | 已修復 |
| `taipei-coffee-expo-2026-complete-guide` | 5 個 H2 後 4 個骨架命名錯位 | GM 改為「展期安排與最佳入場日」「展場動線規劃建議：三種訪客類型路線」並合併 Step 1–4 | 已修復 |

## B 隊列：審計誤報（已剔除）

| Slug | 審計報告所列問題 | 實測結果 |
|------|--------------|---------|
| `chiayi-coffee-festival-2026-guide` | 疑似紅燈/活動時效 | 實測 H2 結構完整（7 個語意正確 H2），活動 11 月舉行未過期，完全合格 |

## C 隊列：源檔有問題但未發布（src-only）

以下三篇審計到的問題文章僅存在於 `08_文章_Articles_HTML/`，未進入 `dist/`，不影響線上讀者。視為源檔重寫排程：

| Slug | 問題 | 排程 |
|------|------|------|
| `sustainable-coffee-complete-guide` | 空 H2 | 排入 B3 6 月重寫隊列（永續主題長青）|
| `yunlin-gukeng-coffee-farmer-story` | 2 個空 H2 | 排入 B3 6 月重寫隊列（產地故事長青）|
| `taipei-coffee-expo-2026-annual-report` | 內容不足 | 待 2026 秋季展覽結束後重新撰寫（保留 slug）|

---

## D 隊列：黃燈批次改善（每週 3 篇節奏）

### D-0 黃燈三刀手術（核心改善線）

**改善方法論（CEO 定義）：** 黃燈核心問題是「說明但不感染」——讀者讀完知道事實，卻沒有想沖一杯咖啡的衝動。改善不是全文重寫（那是 CRITICAL 等級），而是「三刀手術」：
1. 精準插入感官描寫（味覺/嗅覺/觸覺）
2. 移除農場詞（「完整攻略/終極指南」等）
3. 結語場景化（打開畫面，邀請讀者動手）

每篇改動控制 10–25 行，B3 維持高頻率輸出。

| 批次 | 週次 | 文章 | 狀態 |
|------|------|------|------|
| W20 | 2026-W20 | `pour-over-guide`、`cold-brew-complete-101`、`espresso-parameters` | 已完成 |
| W21 | 2026-W21 | `water-quality`、`roast-level-guide`、`processing-methods` | 已完成（CEO 代為 commit f098b42，B3+B9 流水線確認）|
| W22 | 2026-W22 | `light-roast-beginners-guide`、`specialty-coffee-third-wave-history`、`single-origin-terroir-science` | GM 排定，下週派 B3 |
| W23 | 2026-W23 | `coffee-acidity-complete-science`、`cup-tasters-palate-training-guide`、`sca-tasting-vocabulary-guide` | GM 預排 |
| W24+ | 滾動 | 依 GA4 流量排序由 GM 月初排定 | 待排 |

**W21 GM 接手指令（待 B3 完成回報後執行）：**
- 來源檔：`08_文章_Articles_HTML/{water-quality,roast-level-guide,processing-methods}.html`
- 部署檔：`dist/articles/{water-quality,roast-level-guide,processing-methods}.html`
- dist/ 在 .gitignore，commit 必須 `git add -f`（這是刻意設計：dist 是部署產物，只有 GM 確認品質後才手動 force-add，確保沒有未審核內容進入 CI）
- Commit 訊息：`improve(content): W21 黃燈第二批 — 水質/烘焙/處理法 感官補強 + 場景結語`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### D-1 Meta description 過長批次重寫（54 篇）

**問題：** 54 篇文章 meta description 超過 160 字元，被 Google 截斷，降低 CTR。

**底層邏輯：** Meta description 不影響排名，但直接影響 CTR。Google 搜尋結果中 description 被截斷的文章看起來不完整，用戶信任度低。

**BNotes description 策略：** 「一句感官場景 + 一個具體收穫」，控制 140 字元以內留有緩衝。
- 範例：「第一次手沖失敗？九成是水溫的問題。本文帶你用感官而非溫度計找到最佳萃取點。」（66 字，完整不截斷）
- 字數區間：120–155 字元
- 必含：核心關鍵字 + 一個感官鉤子

**執行：** GM 派 B9 撰寫腳本掃描 `dist/articles/*.html`，找出 meta description > 160 字元的全部文章，產出待改清單。B3 批次改寫，優先處理 GA4 流量前 20 篇。

**狀態：** 待 GM 派 B9 啟動（與 W21 平行進行）

### D-2 圖片提示詞過短（<25 字）— 共 65 條

策略：B8/B3 批次強化提示詞，每週 5 條重新生成 hero 圖。優先處理 D-1 同批次文章保持一致性。

### D-3 9 元素結構缺漏

| Slug | 缺項 |
|------|------|
| `brazil-natural-process-guide` | affiliate block |

排入 B3 W22 順手處理。

---

## B1 審核排程（2026-05-05 GM 排定）

**背景：** 以下三篇已通過 B3 起草，status 已為 review，排入 B1 知識審核。今日（2026-05-05）不執行審核，排程供 B1 明日開始執行。

| 優先序 | Slug | 路徑 | 目前 Status | B1 排程 | 備注 |
|--------|------|------|-------------|---------|------|
| 1 | `alishan-2026-sensory-report` | `08_文章_Articles_HTML/alishan-2026-sensory-report.html` | review | 2026-05-06 | 季節性產區報告，需確認風土數據準確性 |
| 2 | `precision-temperature-brewing-science` | `08_文章_Articles_HTML/precision-temperature-brewing-science.html` | review | 2026-05-06 | 科學性文章，需 B1 驗證 pH/溫度數據引用 |
| 3 | `taiwan-coffee-2026-new-season-terroir-guide` | `08_文章_Articles_HTML/taiwan-coffee-2026-new-season-terroir-guide.html` | 缺 status 欄（B3 補寫 review 後才可審）| 2026-05-07 | 六大產區指南，數據量大，B1 需逐項核實 |

**注意事項（B1 執行前必讀）：**
- `taiwan-coffee-2026-new-season-terroir-guide` 缺少 status 欄位，B3 需先補寫 `status: review` 到 frontmatter，再交 B1
- 三篇審核完成後，B1 修改 status 為 `ready`，回報 GM 確認後進入 GM 終審

---

## E 隊列：草稿分類裁決（9 篇 src-only 待 GM 評估）

**問題定位（B9 發現）：** 以下 9 篇在 `08_文章_Articles_HTML/` 有內容但無完整 nav 結構（舊格式草稿），未進入 dist/，對外不可見，佔用倉庫空間和 B3 模糊認知空間。

**分類三選項：**
- **發** — 內容完整 → 派 B3 套用標準模板（canonical shell：`milk-steaming-science.html`）後發布
- **等** — 內容骨架不足 → 排入 B4 選題重寫
- **冰** — 季節性且太早 → 冰存待時機

| Slug | GM 初步判斷（待逐篇實讀後定案）| 處置 |
|------|------|------|
| `alishan-2026-sensory-report` | 季節性產區報告 | 待讀 |
| `geisha-coffee-science-2026` | 長青科學題 | 待讀 |
| `geisha-molecular-biology-2026` | 與上題重疊？需判斷是否合併 | 待讀 |
| `milk-alternatives-science-2026` | 長青健康題 | 待讀 |
| `precision-temperature-brewing-science` | 長青技術題 | 待讀 |
| `taipei-coffee-map-2026` | 城市指南，2026 全年有效 | 待讀 |
| `taiwan-coffee-2026-new-season-terroir-guide` | 季節性產區 | 待讀 |
| `wbc-2026-champion-philosophy` | 賽事題，需確認時效 | 待讀 |
| `wla-champion-2026-tech-breakdown` | 賽事題，需確認時效 | 待讀 |

**GM 排程：** 本週內逐篇評估，下週一前完成 9 篇分類裁決並回報 CEO。

---

## F 隊列：內容覆蓋缺口（B4 選題優先序）

由 B4 排入 06_Topics/ 選題隊列：

1. 瓜地馬拉產區（Antigua / Huehuetenango）— Q3 2026
2. 葉門產區（Mocha 起源故事）— Q3 2026
3. 法式壓壺完全指南（基礎流量題）— Q2 2026
4. 愛樂壓進階沖煮（職人題）— Q2 2026

---

## 內容改善流水線 SOP（職責分離設計）

**B3 工具集：** Read / Write / Edit / Grep / Glob / WebSearch / WebFetch（無 Bash）
**B9 工具集：** 含 Bash，可執行 validate-article.js + git 操作

正確流水線如下（不可跳步）：

```
B3 完成內容改善（修改 08_ 來源檔 + dist 部署檔）
  ↓
B9 接手：執行 validate-article.js 驗證 → git add -f → commit → push
```

**說明：** B3 沒有 Bash，無法執行 validate 和 git 操作。B9 負責技術發布品質把關。這不是額外步驟，而是職責分離的正確設計：B3 管內容品質，B9 管技術發布品質。GM 派遣 B3 做內容改善後，**必須**再派 B9 執行技術發布，否則改善結果不會進入 git。

---

## 執行節奏

- **每週一**：GM 確認本週 3 篇 D-0 黃燈交付 + W+1 預排
- **每週五**：GM 接手 B3 完成的批次，派 B9 執行 validate + git force-add commit/push（dist + src 雙線）
- **每月底**：GM 在月報中匯報改善佇列消化進度（D-0 / D-1 / D-2 / E）
- **觸發升級**：若 4 週內 D-0 消化 < 8 篇，GM 升級 CEO 重新排序

---

## GM 工作追蹤（CEO 交接後新增）

| 任務 | 狀態 | 下一步 |
|------|------|------|
| W21 B3 改善 | 已完成 | CEO 代為 commit f098b42（water-quality/roast-level-guide/processing-methods），無需再處理 |
| W22 選題排定 | 完成 | 下週一派 B3 啟動 |
| D-1 Meta description | 待啟動 | GM 派 B9 寫掃描腳本 |
| E 隊列 9 篇分類 | 待啟動 | GM 本週逐篇實讀後裁決 |
