# BNotes B7 聯盟行銷連結管理文件 v1.0

> **B7 啟動日：** 2026-05-03（Stan 董事長確認，不再等 UV ≥ 3,000）
>
> **核心策略：** 聯盟連結的 Google 信任需要時間沉澱，越早建立越好。
> 從流量最高的文章開始，優先植入 3 個真實連結，再逐步補全全站。

---

## 聯盟平台清單

| 平台 | 計畫名稱 | 佣金率 | 審核週期 | 申請狀態 |
|------|---------|--------|---------|---------|
| Amazon Associates | Amazon Associates (TW) | 2–10% | 即時 | 【TODO：申請並填入 tag=xxxxx】 |
| momo 購物 | momo 聯盟 | 3–8% | 即時 | 【TODO：申請並填入 code】 |
| PChome | PChome 聯盟 | 2–6% | 1–3 天 | 【TODO：申請】 |
| 蝦皮 | Shopee Affiliate | 2–5% | 即時 | 【TODO：申請】 |

**B7 首週行動：** 先申請 Amazon Associates + momo，取得真實連結後回填下方清單。

---

## 連結追蹤規範

所有聯盟連結必須：
1. 附加 UTM 參數：`?utm_source=bnotes&utm_medium=affiliate&utm_campaign={article-slug}`
2. 使用 `rel="noopener sponsored"` 告知 Google
3. 在 GA4 中自動記錄為 `affiliate_click` 事件（已在 app.js 設定）

---

## 文章×產品對應清單（優先補全順序）

> 狀態：`✅ 真實連結` ｜ `⏳ 待填` ｜ `#` 佔位

### 🔥 P0 — 流量前 10 篇（GA4 PageView 排序，需 B9 確認）

| 文章 Slug | 推薦產品 1 | 推薦產品 2 | 推薦產品 3 | 狀態 |
|-----------|-----------|-----------|-----------|------|
| `pour-over-guide` | Hario V60 濾杯 | Timemore 細口壺 | Acaia Pearl 電子秤 | ⏳ 待填 |
| `grinder-guide-2026` | Comandante C40 手搖磨豆機 | Timemore C3 入門款 | 1Zpresso JX-Pro | ⏳ 待填 |
| `espresso-parameters` | Breville Barista Express | De'Longhi Dedica | Lelit Mara X | ⏳ 待填 |
| `cold-brew-complete-101` | Fellow Atmos 冷萃桶 | Toddy 冷萃系統 | 粗研磨濾紙袋 | ⏳ 待填 |
| `arabica-vs-robusta-complete-guide` | Daterra 阿拉比卡精品豆 | 哥倫比亞水洗豆 | 衣索比亞日曬豆 | ⏳ 待填 |
| `water-quality` | BWT 濾水壺 | Third Wave Water 礦物包 | TDS 筆 | ⏳ 待填 |
| `milk-steaming-science` | Rhinowares 拉花鋼杯 | Motta 奶泡缸 | 奶泡溫度計 | ⏳ 待填 |
| `geisha-molecular-biology-2026` | Hacienda La Esmeralda Geisha 豆 | SCA 品評玻璃杯 | 電子秤 | ⏳ 待填 |
| `processing-methods` | 肯亞 AA 水洗豆 | 衣索比亞耶加雪菲 | 日曬豆禮盒 | ⏳ 待填 |
| `roast-level-guide` | 家用小型烘焙機 | 探針溫度計 | 烘豆冷卻篩網 | ⏳ 待填 |

### 🟡 P1 — 器材類高轉換文章

| 文章 Slug | 推薦產品 1 | 推薦產品 2 | 推薦產品 3 | 狀態 |
|-----------|-----------|-----------|-----------|------|
| `grinder-6models-comparison-2026` | Comandante C40 | Kinu M47 | Timemore C3 Pro | ⏳ 待填 |
| `v60-vs-kalita-filter-geometry` | Hario V60 02 | Kalita Wave 155 | Chemex 6杯 | ⏳ 待填 |
| `espresso-ratio-science` | 義式機推薦（依預算） | 填壓器 | 電子秤 0.1g | ⏳ 待填 |
| `latte-art` | Rhinowares 拉花鋼杯 | Latte Art 練習組 | 義式機入門款 | ⏳ 待填 |
| `home-roasting-beginners-complete` | Fresh Roast SR800 | Gene Café CBR-101 | 生豆直購網站 | ⏳ 待填 |
| `coffee-equipment-cleaning-bible` | 義式機清潔錠 Cafiza | 磨豆機清潔球 Grindz | 微纖布 | ⏳ 待填 |
| `taiwan-coffee-equipment-midyear-2026` | 本季編輯精選 1 | 本季編輯精選 2 | 本季編輯精選 3 | ⏳ 待填 |

### 🟢 P2 — 產地 / 沖煮科學類（豆子 + 配件推薦）

| 文章 Slug | 推薦產品 | 狀態 |
|-----------|---------|------|
| `ethiopia-natural-process-deep-dive` | 衣索比亞西達馬日曬豆 | ⏳ 待填 |
| `kenya-aa-flavor-profile-deep` | 肯亞 AA 水洗豆 | ⏳ 待填 |
| `colombia-main-harvest-selection` | 哥倫比亞 Huila 豆 | ⏳ 待填 |
| `cold-brew-advanced-science` | 冷萃器材組 | ⏳ 待填 |
| `pour-over-variable-complete-experiment` | 手沖全套組 | ⏳ 待填 |

---

## gear.html 器材推薦頁狀態

`/gear.html` 是 BNotes 最高聯盟轉換頁面，需優先補全：

| 類別 | 推薦產品 | 當前連結狀態 | 目標連結 |
|------|---------|------------|---------|
| 磨豆機入門 | Timemore C3 / C3 Pro | 【待確認】 | Amazon Associates |
| 磨豆機進階 | Comandante C40 | 【待確認】 | Amazon Associates |
| 手沖壺 | Timemore Fish Smart | 【待確認】 | momo |
| 濾杯 | Hario V60 02 | 【待確認】 | Amazon Associates |
| 電子秤 | Acaia Pearl / Timemore Black Mirror | 【待確認】 | Amazon Associates |
| 義式機 | Breville Barista Express | 【待確認】 | Amazon Associates |

---

## B7 月度追蹤模板

每月月報時，B7 填入以下數據：

```
### 聯盟行銷月報 YYYY-MM

| 平台 | 點擊數 | 轉換數 | 估算佣金 | 最高轉換文章 |
|------|--------|--------|---------|------------|
| Amazon | - | - | NT$- | - |
| momo | - | - | NT$- | - |
| PChome | - | - | NT$- | - |

GA4 affiliate_click 事件總數：-
gear.html 月訪客：-

本月優化行動：
- [ ] 
```

---

## 版本紀錄

| 版本 | 日期 | 說明 |
|------|------|------|
| v1.0 | 2026-05-03 | B7 啟動，Stan 董事長確認，建立連結管理基礎框架 |
