# BNotes 內部連結地圖 v1.0

> **維護者：** B8 SEO 分發長  
> **更新週期：** 每次新文章發布後更新  
> **用途：** Topic Cluster 架構 — 確保每篇文章都被正確連結，Google 能爬到全站，PageRank 在群內流動  
> **執行原則：** 每篇新文章發布時，回頭在相關文章的 `further-reading` block 加入新連結

---

## Topic Cluster 架構圖

```
【手沖 Hub】pour-over-guide
    ├── v60-vs-kalita-filter-geometry
    ├── pour-over-variable-complete-experiment
    ├── water-quality
    ├── brewing-diagnosis-w01
    ├── autumn-brewing-temperature-guide
    └── winter-brewing-w04

【義式 Hub】espresso-parameters
    ├── espresso-ratio-science
    ├── latte-art
    ├── milk-steaming-science
    ├── plant-milk-barista-complete-guide
    └── milk-alternatives-science-2026

【冷萃 Hub】cold-brew-complete-101
    ├── cold-brew-advanced-science
    ├── nitro-cold-brew-home-guide
    └── summer-iced-coffee-three-recipes

【磨豆機 Hub】grinder-guide-2026
    ├── grinder-6models-comparison-2026
    ├── coffee-equipment-cleaning-bible
    └── taiwan-coffee-equipment-midyear-2026

【烘豆 Hub】roast-level-guide
    ├── home-roasting-beginners-complete
    ├── light-roast-beginners-guide
    └── wbrc-2026-roasting-analysis

【產地 Hub】single-origin-terroir-science
    ├── kenya-aa-flavor-profile-deep
    ├── ethiopia-natural-process-deep-dive
    ├── ethiopia-vs-colombia-natural-showdown
    ├── colombia-main-harvest-selection
    ├── colombia-mitaca-second-harvest
    ├── alishan-terroir
    ├── alishan-new-crop-w02
    ├── geisha-molecular-biology-2026
    └── taiwan-coffee-farmer-summer-story

【處理法 Hub】processing-methods
    ├── ethiopia-natural-process-deep-dive
    ├── ethiopia-vs-colombia-natural-showdown
    └── green-bean-sourcing-complete-guide

【品飲 Hub】cup-tasters-palate-training-guide
    ├── sca-tasting-vocabulary-guide
    ├── coffee-acidity-complete-science
    ├── coffee-dessert-pairing-science
    └── flavor-pairing-w03

【台北 Hub】taipei-specialty-cafes
    ├── taipei-coffee-map-2026
    ├── taipei-coffee-expo-2026-complete-guide
    └── chiayi-coffee-festival-2026-guide

【知識 Hub】arabica-vs-robusta-complete-guide
    ├── specialty-coffee-third-wave-history
    ├── sustainable-coffee-complete-guide
    └── taiwan-specialty-coffee-whitepaper-2026
```

---

## 詳細連結清單（每篇文章應連往哪裡）

### 手沖技法群組

**`pour-over-guide`** ← Hub 文章
- 應連出：`v60-vs-kalita-filter-geometry`、`water-quality`、`brewing-diagnosis-w01`、`grinder-guide-2026`
- 應被連入：所有手沖子文章的 further-reading、`arabica-vs-robusta-complete-guide`

**`v60-vs-kalita-filter-geometry`**
- 應連出：`pour-over-guide`（Hub）、`grinder-guide-2026`、`pour-over-variable-complete-experiment`
- 應被連入：`pour-over-guide`、`grinder-guide-2026`

**`pour-over-variable-complete-experiment`**
- 應連出：`pour-over-guide`（Hub）、`water-quality`、`brewing-diagnosis-w01`
- 應被連入：`pour-over-guide`、`water-quality`

**`water-quality`**
- 應連出：`pour-over-guide`、`espresso-parameters`、`brewing-diagnosis-w01`
- 應被連入：`pour-over-guide`、`espresso-parameters`、`pour-over-variable-complete-experiment`

**`brewing-diagnosis-w01`**
- 應連出：`pour-over-guide`（Hub）、`water-quality`、`grinder-guide-2026`
- 應被連入：`pour-over-guide`、`pour-over-variable-complete-experiment`

**`cold-brew-complete-101`** ← Hub 文章
- 應連出：`cold-brew-advanced-science`、`nitro-cold-brew-home-guide`、`grinder-guide-2026`
- 應被連入：所有冷萃子文章、`summer-iced-coffee-three-recipes`

**`cold-brew-advanced-science`**
- 應連出：`cold-brew-complete-101`（Hub）、`water-quality`
- 應被連入：`cold-brew-complete-101`

**`nitro-cold-brew-home-guide`**
- 應連出：`cold-brew-complete-101`（Hub）
- 應被連入：`cold-brew-complete-101`、`summer-iced-coffee-three-recipes`

**`summer-iced-coffee-three-recipes`**
- 應連出：`cold-brew-complete-101`、`nitro-cold-brew-home-guide`
- 應被連入：`cold-brew-complete-101`

**`competition-recipe-homebrew-guide`**
- 應連出：`espresso-parameters`、`grinder-guide-2026`、`wbc-2026-champion-technique-breakdown`

**`autumn-brewing-temperature-guide`**
- 應連出：`pour-over-guide`（Hub）、`roast-level-guide`
- 應被連入：`pour-over-guide`

**`winter-brewing-w04`**
- 應連出：`pour-over-guide`（Hub）、`cold-brew-complete-101`
- 應被連入：`pour-over-guide`

---

### 義式咖啡群組

**`espresso-parameters`** ← Hub 文章
- 應連出：`espresso-ratio-science`、`grinder-guide-2026`、`milk-steaming-science`
- 應被連入：所有義式子文章、`latte-art`、`competition-recipe-homebrew-guide`

**`espresso-ratio-science`**
- 應連出：`espresso-parameters`（Hub）、`grinder-guide-2026`
- 應被連入：`espresso-parameters`

**`latte-art`**
- 應連出：`espresso-parameters`（Hub）、`milk-steaming-science`
- 應被連入：`espresso-parameters`、`milk-steaming-science`

**`milk-steaming-science`**
- 應連出：`espresso-parameters`（Hub）、`latte-art`、`plant-milk-barista-complete-guide`
- 應被連入：`espresso-parameters`、`latte-art`

**`plant-milk-barista-complete-guide`**
- 應連出：`milk-steaming-science`、`milk-alternatives-science-2026`、`espresso-parameters`
- 應被連入：`milk-steaming-science`

**`milk-alternatives-science-2026`**
- 應連出：`plant-milk-barista-complete-guide`、`milk-steaming-science`
- 應被連入：`plant-milk-barista-complete-guide`

---

### 磨豆機 / 器材群組

**`grinder-guide-2026`** ← Hub 文章（最高聯盟轉換）
- 應連出：`grinder-6models-comparison-2026`、`coffee-equipment-cleaning-bible`、`pour-over-guide`
- 應被連入：**幾乎所有技法文章** — 這是全站最重要的連結節點

**`grinder-6models-comparison-2026`**
- 應連出：`grinder-guide-2026`（Hub）、`coffee-equipment-cleaning-bible`
- 應被連入：`grinder-guide-2026`

**`coffee-equipment-cleaning-bible`**
- 應連出：`grinder-guide-2026`（Hub）、`espresso-parameters`
- 應被連入：`grinder-guide-2026`、`grinder-6models-comparison-2026`

**`taiwan-coffee-equipment-midyear-2026`**
- 應連出：`grinder-guide-2026`、`espresso-parameters`、`pour-over-guide`
- 應被連入：`grinder-guide-2026`

**`home-coffee-corner`**
- 應連出：`grinder-guide-2026`、`pour-over-guide`
- 應被連入：`morning-coffee-ritual-science`

---

### 烘豆群組

**`roast-level-guide`** ← Hub 文章
- 應連出：`home-roasting-beginners-complete`、`light-roast-beginners-guide`、`arabica-vs-robusta-complete-guide`
- 應被連入：所有烘豆子文章、`arabica-vs-robusta-complete-guide`

**`home-roasting-beginners-complete`**
- 應連出：`roast-level-guide`（Hub）、`green-bean-sourcing-complete-guide`
- 應被連入：`roast-level-guide`

**`light-roast-beginners-guide`**
- 應連出：`roast-level-guide`（Hub）、`single-origin-terroir-science`
- 應被連入：`roast-level-guide`

---

### 品飲 / 感官群組

**`cup-tasters-palate-training-guide`** ← Hub 文章
- 應連出：`sca-tasting-vocabulary-guide`、`coffee-acidity-complete-science`、`single-origin-terroir-science`
- 應被連入：所有品飲子文章

**`sca-tasting-vocabulary-guide`**
- 應連出：`cup-tasters-palate-training-guide`（Hub）、`coffee-acidity-complete-science`
- 應被連入：`cup-tasters-palate-training-guide`

**`coffee-acidity-complete-science`**
- 應連出：`cup-tasters-palate-training-guide`（Hub）、`water-quality`、`processing-methods`
- 應被連入：`cup-tasters-palate-training-guide`、`sca-tasting-vocabulary-guide`

**`coffee-dessert-pairing-science`**
- 應連出：`cup-tasters-palate-training-guide`、`sca-tasting-vocabulary-guide`
- 應被連入：`cup-tasters-palate-training-guide`

**`flavor-pairing-w03`**
- 應連出：`sca-tasting-vocabulary-guide`、`coffee-acidity-complete-science`
- 應被連入：`cup-tasters-palate-training-guide`

---

### 產地 / 風土群組

**`single-origin-terroir-science`** ← Hub 文章（橋樑文章）
- 應連出：`kenya-aa-flavor-profile-deep`、`ethiopia-natural-process-deep-dive`、`alishan-terroir`、`processing-methods`
- 應被連入：所有產地子文章、`arabica-vs-robusta-complete-guide`

**`kenya-aa-flavor-profile-deep`**
- 應連出：`single-origin-terroir-science`（Hub）、`cup-tasters-palate-training-guide`、`processing-methods`
- 應被連入：`single-origin-terroir-science`

**`ethiopia-natural-process-deep-dive`**
- 應連出：`single-origin-terroir-science`（Hub）、`processing-methods`、`ethiopia-vs-colombia-natural-showdown`
- 應被連入：`single-origin-terroir-science`、`processing-methods`

**`ethiopia-vs-colombia-natural-showdown`**
- 應連出：`ethiopia-natural-process-deep-dive`、`colombia-main-harvest-selection`、`processing-methods`
- 應被連入：`single-origin-terroir-science`、`ethiopia-natural-process-deep-dive`

**`colombia-main-harvest-selection`**
- 應連出：`single-origin-terroir-science`（Hub）、`processing-methods`、`colombia-mitaca-second-harvest`
- 應被連入：`single-origin-terroir-science`、`ethiopia-vs-colombia-natural-showdown`

**`colombia-mitaca-second-harvest`**
- 應連出：`colombia-main-harvest-selection`、`single-origin-terroir-science`
- 應被連入：`colombia-main-harvest-selection`

**`alishan-terroir`**
- 應連出：`single-origin-terroir-science`（Hub）、`taiwan-coffee-farmer-summer-story`、`alishan-new-crop-w02`
- 應被連入：`single-origin-terroir-science`、`taipei-specialty-cafes`

**`alishan-new-crop-w02`**
- 應連出：`alishan-terroir`、`green-bean-sourcing-complete-guide`
- 應被連入：`alishan-terroir`

**`geisha-molecular-biology-2026`**
- 應連出：`single-origin-terroir-science`（Hub）、`processing-methods`、`sca-tasting-vocabulary-guide`
- 應被連入：`single-origin-terroir-science`

**`green-bean-sourcing-complete-guide`**
- 應連出：`single-origin-terroir-science`（Hub）、`roast-level-guide`、`processing-methods`
- 應被連入：`home-roasting-beginners-complete`、`alishan-new-crop-w02`

**`processing-methods`** ← Hub 文章（處理法）
- 應連出：`ethiopia-natural-process-deep-dive`、`kenya-aa-flavor-profile-deep`、`single-origin-terroir-science`
- 應被連入：幾乎所有產地文章

**`taiwan-coffee-farmer-summer-story`**
- 應連出：`alishan-terroir`、`sustainable-coffee-complete-guide`
- 應被連入：`alishan-terroir`、`taipei-specialty-cafes`

---

### 咖啡廳 / 城市群組

**`taipei-specialty-cafes`** ← Hub 文章
- 應連出：`taipei-coffee-map-2026`、`alishan-terroir`（台灣在地豆）、`pour-over-guide`
- 應被連入：所有台北子文章、`specialty-coffee-third-wave-history`

**`taipei-coffee-map-2026`**
- 應連出：`taipei-specialty-cafes`（Hub）、`taipei-coffee-expo-2026-complete-guide`
- 應被連入：`taipei-specialty-cafes`

**`taipei-coffee-expo-2026-complete-guide`**
- 應連出：`taipei-specialty-cafes`（Hub）、`taipei-coffee-map-2026`、`geisha-molecular-biology-2026`
- 應被連入：`taipei-specialty-cafes`、`taipei-coffee-map-2026`

**`chiayi-coffee-festival-2026-guide`**
- 應連出：`alishan-terroir`、`taiwan-coffee-farmer-summer-story`
- 應被連入：`taipei-specialty-cafes`

---

### 知識 / 歷史群組

**`arabica-vs-robusta-complete-guide`** ← Hub 文章（基礎知識）
- 應連出：`single-origin-terroir-science`、`processing-methods`、`roast-level-guide`
- 應被連入：幾乎所有入門文章

**`specialty-coffee-third-wave-history`**
- 應連出：`arabica-vs-robusta-complete-guide`（Hub）、`taipei-specialty-cafes`
- 應被連入：`arabica-vs-robusta-complete-guide`

**`sustainable-coffee-complete-guide`**
- 應連出：`single-origin-terroir-science`、`taiwan-coffee-farmer-summer-story`
- 應被連入：`arabica-vs-robusta-complete-guide`

---

## 「孤島文章」偵測清單（需補充連入連結）

以下文章連入連結較少，B8 應在相關文章的 `further-reading` 中補充：

| 文章 Slug | 建議連入來源 |
|-----------|------------|
| `competition-recipe-homebrew-guide` | `espresso-parameters`、`grinder-guide-2026` |
| `wbc-2026-champion-philosophy` | `wbc-2026-champion-technique-breakdown`、`specialty-coffee-third-wave-history` |
| `turkish-coffee-ibrik` | `specialty-coffee-third-wave-history`、`arabica-vs-robusta-complete-guide` |
| `solo-brewing-valentines` | `pour-over-guide`、`coffee-reading-afternoon-ritual` |
| `christmas-coffee-gift-guide-2026` | `grinder-guide-2026`、`taiwan-coffee-equipment-midyear-2026` |
| `new-years-eve-coffee-survival-guide` | `espresso-parameters`、`cold-brew-complete-101` |
| `international-coffee-day-10-stories` | `specialty-coffee-third-wave-history`、`arabica-vs-robusta-complete-guide` |
| `taiwan-coffee-subscription-guide-2026` | `single-origin-terroir-science`、`alishan-terroir` |
| `morning-coffee-ritual-science` | `pour-over-guide`、`home-coffee-corner` |

---

## 版本紀錄

| 版本 | 日期 | 說明 |
|------|------|------|
| v1.0 | 2026-05-03 | B8 建立，完整 Topic Cluster 架構，63 篇文章連結矩陣，孤島偵測清單 |
