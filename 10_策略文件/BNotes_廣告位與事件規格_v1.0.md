# BNotes 廣告位與事件規格 v1.0（2026-11-26 定版）

狀態：**設計定版、版位已預留（未啟用）、未註冊任何廣告網絡**。本文件是商業化點火時的「設定規格」——點火 = 依本規格接上廣告網絡並開啟開關，不需要改版重工。

## 一、版位清單（已預留）

版位以 inert placeholder 形式存在於模板中：`<div class="ad-slot" data-ad-slot="..." data-ad-format="..." hidden>`。`hidden` 狀態下零版面影響、零請求。啟用方式：移除 `hidden`、由設定旗標（`data-ads="on"`）載入廣告網絡腳本並填入版位。

| 版位 ID | 位置 | 格式 | 預留尺寸（CLS 安全） | 已部署於 |
|---|---|---|---|---|
| `in-article-mid` | 文章中段（第二個 H2 之前） | responsive | min-height 280px 固定盒 | 模板範例：caffeine-complete-science |
| `in-article-end` | 文章結尾、延伸閱讀之前 | responsive | min-height 280px 固定盒 | 規格保留，新文模板內建 |
| `home-mid` | 首頁精選區與電子報之間 | leaderboard | 728×90（行動 320×100）固定盒 | index.html |
| `category-top` | 分類頁 hero 下方 | leaderboard | 同上 | 規格保留，點火時加 |
| `newsletter-sponsor` | 電子報頂部贊助區塊 | 文字+小圖 | 固定欄位 | 規格保留（電子報系統） |

規則：每頁最多 2 個展示版位；版位不得出現在第一屏主視覺範圍內；廣告與編輯內容之間須有視覺分隔與「廣告」標示（見《廣告與贊助政策》/sponsorship）。

## 二、效能護欄

- 廣告腳本一律延遲載入（defer / 使用者互動後），不得阻塞 LCP 與核心內容渲染。
- 版位盒在廣告填入前後尺寸不變（固定 min-height），CLS 增量 ≤0.05。
- 廣告相關 payload 初始載入 ≤150KB；超出時以 lazy load 分段。
- 若廣告網絡造成 Core Web Vitals 連續兩個月劣化至紅區，依 runbook 程序評估更換或降載。

## 三、GA4 事件規格（點火時實作）

現行站上 GA4 標籤：`G-2WXMBSHDSB`（全站一致；另有 property ID 對應問題待核實，見流量基線文件）。

| 事件名 | 觸發 | 參數 |
|---|---|---|
| `ad_slot_view` | 版位進入可視範圍（≥50%，≥1 秒） | `slot_id`, `page_path` |
| `ad_slot_click` | 廣告點擊（由網絡回呼） | `slot_id`, `page_path` |
| `affiliate_click` | 讀者點擊 `/re/` 聯盟轉址 | `target`（轉址代碼）, `page_path`, `article_slug` |
| `newsletter_signup` | 電子報訂閱成功回應 | `source`（home / article / about） |
| `outbound_click` | 連往外部來源（參考資料） | `domain`, `page_path` |

`affiliate_click` 與 `newsletter_signup` 不需等廣告點火即可先行實作（前者是既有聯盟收入的量測缺口，後者是電子報成效的基本盤）——列入 runbook 的待辦佇列，實作時機由 Jobs 排程。

## 四、點火檢查清單（未來執行）

1. 廣告網絡註冊與審核（Stanley 核准支出/合約層級事項）。
2. 依第一節版位表逐一啟用 placeholder， staging 驗證 CLS 與 LCP。
3. 實作第三節 GA4 事件並以即時報表驗證。
4. /sponsorship 頁面文字與實際投放型態對齊複查。
5. 上線後第一個月：每週檢查 CWV 與收益/體驗平衡，寫入月度量測紀錄。
