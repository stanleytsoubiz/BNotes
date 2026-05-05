# B4 知識雷達監控機制
> 建立日期：2026-05-05｜版本：v1.0｜負責人：B4（AI知識蒐集工程師）

---

## 一、監控來源清單

### A 級來源（學術 / 官方 — 最高優先）

| 序號 | 來源名稱 | URL | 監控方式 | 備註 |
|------|----------|-----|----------|------|
| A1 | SCA（Specialty Coffee Association） | https://sca.coffee/news | 每 72 小時掃描首頁 + News | 官方研究公告、競賽政策、可持續發展報告 |
| A2 | World Coffee Championships（WCC） | https://wcc.coffee/latest-news | 每 72 小時 | WBC / WBrC / WLAC 等賽事官方動態 |
| A3 | Coffee Science Foundation（CSF） | https://coffeescience.org | 每週掃描 | 同儕審閱研究報告 |
| A4 | COE（Cup of Excellence） | https://allianceforcoffeeexcellence.org/news | 每週掃描 | 拍賣公告、得獎莊園資料 |
| A5 | ICO（International Coffee Organization） | https://www.ico.org/new_historical.asp | 每月掃描 | 產量報告、氣候影響數據 |

### B 級來源（精品咖啡媒體 — 高頻監控）

| 序號 | 來源名稱 | URL | 監控方式 | 備註 |
|------|----------|-----|----------|------|
| B1 | Perfect Daily Grind | https://perfectdailygrind.com | 每 72 小時 | 深度技術文章首選 |
| B2 | Barista Hustle | https://www.baristahustle.com/blog | 每 72 小時 | 萃取科學、配方研究 |
| B3 | Sprudge | https://sprudge.com | 每週 | 賽事即時報導、產業新聞 |
| B4-src | Daily Coffee News（Roast Magazine） | https://dailycoffeenews.com | 每週 | 產業動態交叉驗證 |
| B5 | BeanScene Magazine | https://www.beanscenemag.com.au | 每週 | 澳洲 / 亞太視角補充 |

### C 級來源（學術期刊 — 低頻高價值）

| 序號 | 來源名稱 | URL | 監控方式 | 備註 |
|------|----------|-----|----------|------|
| C1 | Journal of Agricultural and Food Chemistry | https://pubs.acs.org/journal/jafcau | 每月 | 咖啡化學成分研究 |
| C2 | Comprehensive Reviews in Food Science and Food Safety（Wiley）| https://ift.onlinelibrary.wiley.com | 每月 | 發酵、處理法系統性研究 |
| C3 | Food Microbiology（ScienceDirect） | https://www.sciencedirect.com | 每月 | 微生物與發酵風味機制 |

---

## 二、監控頻率與 SOP

```
每 72 小時（B4 當值）
    ↓
掃描 A1、A2、B1、B2 四個來源
    ↓
標記有效新知識（≥ 2 個來源交叉驗證）
    ↓
按緊急度打標：🔴 A 級 / 🟡 B 級 / 🟢 C 級
    ↓
填入下方「入庫候選區」或直接進入選題簡報

每週（週一例行）
    ↓
掃描 B3、B4-src、B5 三個 B 級媒體來源
    ↓
補充 Evergreen 型選題候選

每月（月初）
    ↓
掃描 A4、A5、C1、C2、C3 低頻高價值來源
    ↓
更新長效選題庫
```

---

## 三、入庫標準

### A 級知識（72hr 緊急處理）
- 出自 SCA 官方 / WCC 官方 / 學術期刊
- 或賽事結果（WBC / WBrC / WLAC）冠軍技術揭秘
- 或重大產業轉折（氣候事件、政策、定價衝擊）

### B 級知識（本週處理）
- 有實質技術深度，且至少 2 個媒體來源涵蓋
- 或有直接讀者痛點連結（搜尋量預估中高）
- 台灣 / 華文圈尚未有對應深度文章

### C 級知識（本月排入）
- Evergreen 常青型，不急但有長期 SEO 價值
- 學術研究可翻譯為實用知識
- 台灣市場成熟度尚低的新興概念

### 不入庫條件
- 純業配 / 商業公告（無知識密度）
- 單一來源未經交叉驗證
- 華文世界已有完整且高品質報導

---

## 四、已監控到但暫不處理的知識點（備用庫）

> 本節記錄「已掃描、有潛力但目前優先序較低」的知識點，供未來選題排程使用。

### 備用-001
**主題：** SCA 咖啡可持續發展 2026 年報
**來源：** https://sca.coffee/sca-news/2026-sca-sustainability-awards-winners
**概況：** Bean Voyage（女性咖啡農扶持）與 Coffee Circle 分別拿下非營利 / 營利類永續獎，Bean Voyage 已協助 1,300 名女性小農直接進入市場，產生超過 USD 140 萬直接收入。
**暫緩理由：** 議題偏向咖啡文化與公平貿易，BNotes 核心受眾（技術型愛好者）需求匹配度中等；可在永續話題升溫時啟用。
**預估緊急度：** 🟢 本月

### 備用-002
**主題：** Gen Z 如何消費精品咖啡（Perfect Daily Grind 2026-02）
**來源：** https://perfectdailygrind.com/2026/02/what-does-gen-z-want-from-specialty-coffee/
**概況：** Z 世代咖啡消費行為調查，偏好外帶 / 社群化 / 視覺驅動，對產地故事接受度差異大。
**暫緩理由：** 趨勢型選題，非技術知識，較適合社群內容。
**預估緊急度：** 🟢 本月

### 備用-003
**主題：** 精品咖啡競賽的創新性討論（Perfect Daily Grind 2026-01）
**來源：** https://perfectdailygrind.com/2026/01/innovation-creativity-coffee-competitions/
**概況：** 探討 WBC 等賽事是否真正推動技術創新，還是製造了泡沫式表演。
**暫緩理由：** 觀點型議題，需搭配賽事高峰期（2026 WBC 於 10 月），時效性較弱。
**預估緊急度：** 🟢 本月

### 備用-004
**主題：** 世界拉花藝術冠軍林少勳（Bala）奪冠技術分析
**來源：** https://sprudge.com/bala-of-taiwan-is-the-2026-world-latte-art-champion-893676.html
**概況：** 台灣代表 Bala 以自由流（free-pour）動物系圖案奪 2026 WLAC 冠軍，技術核心為時間管理與精準控水。
**暫緩理由：** 此為台灣人奪冠，具備高情感共鳴，但 BNotes 五大類別中拉花藝術屬於邊緣地帶（沖泡科學？咖啡文化？分類需確認）。建議交 GM 確認類別歸屬後優先排入。
**預估緊急度：** 🟡 本週（台灣讀者情感連結強，應加速）

---

## 五、第一批選題簡報（2026-05-05）

完整選題內容請見 B4 選題建議輸出文件（本次 Session 回報 GM）。

---

## 六、版本記錄

| 版本 | 日期 | 變更說明 |
|------|------|----------|
| v1.0 | 2026-05-05 | B4 正式啟動，建立初始監控機制 |
