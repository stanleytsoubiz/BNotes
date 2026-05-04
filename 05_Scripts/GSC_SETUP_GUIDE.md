# Google Search Console 設定指南
## bnotescoffee.com｜2026-05-04 B9 製作

---

## 現況確認

| 項目 | 狀態 |
|------|------|
| GA4 安裝 | ✅ 全站統一使用 `G-2WXMBSHDSB` |
| robots.txt | ✅ 正常，已指向 sitemap |
| sitemap.xml | ✅ `https://bnotescoffee.com/sitemap.xml` |
| IndexNow (Bing) | ✅ 已設置 key：`4c5bbd8accc0d62f986790f5eb4818e5` |
| GSC 驗證 | ❌ **尚未連接，需要 Stan 操作** |

---

## 方法一：Google Analytics 驗證（最推薦）⭐

**前提：** GA4 屬性 `G-2WXMBSHDSB` 必須在同一個 Google 帳號下

**步驟：**
1. 前往 [Google Search Console](https://search.google.com/search-console)
2. 點擊「新增資源」→ 選擇「網址前置字元」
3. 輸入：`https://bnotescoffee.com`
4. 選擇驗證方式：**Google Analytics**
5. 系統偵測到網站已安裝 GA4 → 自動驗證完成 ✅
6. 驗證成功後，前往「Sitemap」→ 新增 `sitemap.xml`

**優點：** 不需要改動任何程式碼，最快（5 分鐘完成）

---

## 方法二：HTML Meta 標籤驗證

**步驟：**
1. 前往 GSC → 新增資源 → 選擇「HTML 標記」驗證
2. 複製 GSC 提供的驗證碼，格式如下：
   ```
   <meta name="google-site-verification" content="[YOUR_CODE_HERE]">
   ```
3. **插入位置：** `dist/index.html` 第 8 行（`<meta name="robots">` 前）：
   ```html
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>BNotes...</title>
   <meta name="description" content="...">
   <meta name="robots" content="index,follow...">
   ← 在這行前插入 google-site-verification meta 標籤
   ```
4. 同步更新 `07_核心頁面_HTML/index.html` 相同位置
5. git push 部署後，回到 GSC 點「驗證」

---

## 方法三：HTML 檔案驗證

**步驟：**
1. GSC 提供一個 HTML 驗證檔案，如 `googlabc123def456.html`
2. 將此檔案放入 `dist/` 根目錄
3. git add -f dist/googlabc123def456.html → git push 部署
4. 確認可訪問：`https://bnotescoffee.com/googlabc123def456.html`
5. 回到 GSC 點「驗證」

---

## 驗證完成後立即執行（B9 負責）

```bash
# 1. 提交 sitemap
# GSC 後台 → Sitemap → 輸入：sitemap.xml → 提交

# 2. 請求索引：首頁
# GSC 後台 → URL 檢查 → 輸入 https://bnotescoffee.com → 請求建立索引

# 3. 使用 IndexNow 通知 Bing（已設置，每次新文章發布後執行）
KEY="4c5bbd8accc0d62f986790f5eb4818e5"
curl -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"host":"bnotescoffee.com","key":"'$KEY'","keyLocation":"https://bnotescoffee.com/'$KEY'.txt","urlList":["https://bnotescoffee.com/"]}'
```

---

## GSC 連接後 CEO 要看的三個指標

| 指標 | 位置 | 意義 |
|------|------|------|
| 索引涵蓋範圍 | 索引 → 網頁 | 確認有多少篇文章被 Google 收錄 |
| 成效報告 | 成效 → 搜尋結果 | 看哪些關鍵字帶來點擊 |
| 核心網站體驗 | 體驗 → 網頁體驗 | 確認 Core Web Vitals 通過 |

---

## 給 Stan 的操作說明（非技術版）

> 您只需要做一件事：
>
> 1. 用您的 Google 帳號登入 [search.google.com/search-console](https://search.google.com/search-console)
> 2. 新增資源 → 輸入 `https://bnotescoffee.com`
> 3. 選擇「Google Analytics」驗證（最快）
> 4. 驗證成功 → 到「Sitemap」→ 輸入 `sitemap.xml` → 提交
>
> 完成後請告知 CEO，B9 會處理後續的技術優化。
