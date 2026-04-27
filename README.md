# BNotes 焙學·原豆誌 — 完整知識庫 v2026

## 目錄結構
```
01_知識資料庫/       → MasterKB（10章節）、Migration Playbook、Brewing Guide PDF
02_部署設定/         → package.json、wrangler.toml、_headers、_redirects、robots.txt、sitemap.xml
03_自動化工作流/     → GitHub Actions workflows（AI pipeline、publish-scheduled 等）
04_CF_Worker_Functions/ → Cloudflare Pages Functions（api/、admin/、articles/）
05_Scripts/          → strip-frontmatter.js、sync-index.js
06_後台Admin_JS/     → admin-app.js v1/v2/v3、後台 admin HTML
07_核心頁面_HTML/    → index.html、about.html、404.html、分類頁、pillar 頁
08_文章_Articles_HTML/ → 全站 64 篇文章 HTML
09_排程文章_Scheduled/ → 待發布排程文章（5篇）+ 排程索引 JSON
10_策略文件/         → 執行計畫、KPI 追蹤、內容矩陣、SEO關鍵字矩陣、內容日曆
```

## 技術架構
- 靜態網站：Cloudflare Pages（dist/ 目錄）
- 後台 API：Cloudflare Workers Functions（functions/ 目錄）
- 自動化：GitHub Actions（每週一 UTC 01:00 = 台灣 09:00）
- 網域：https://bnotescoffee.com
- 文章品質：48 篇全綠（平均 91.8/100）

## 最後更新
2026-04-21 — 修復 Load More 重複/英文標題/連結404，新建文章列表頁
