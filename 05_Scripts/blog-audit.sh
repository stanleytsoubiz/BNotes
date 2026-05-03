#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# BNotes Blog Audit Script v1.0
# GM 自主深度掃描工具 — 每週由排程自動觸發，亦可手動執行
#
# 使用方式：
#   bash 05_Scripts/blog-audit.sh            # 完整掃描
#   bash 05_Scripts/blog-audit.sh --quick    # 僅技術性檢查（快速）
#   bash 05_Scripts/blog-audit.sh --visual   # 提示需視覺驗圖的清單
#
# 輸出：AUDIT_REPORT.md（自動更新）
# ════════════════════════════════════════════════════════════════════════════

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
ARTICLES="$DIST/articles"
IMAGES="$DIST/images/ai"
SCRIPTS="$ROOT/05_Scripts"
REPORT="$SCRIPTS/AUDIT_REPORT.md"
DATE=$(date '+%Y-%m-%d %H:%M')
ISSUES=0
WARNINGS=0

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; ((WARNINGS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((ISSUES++)); }
hdr()  { echo -e "\n${CYAN}══ $1 ══${NC}"; }

echo "════════════════════════════════════════"
echo " BNotes Blog Audit  |  $DATE"
echo "════════════════════════════════════════"

# ── Initialize report ────────────────────────────────────────────────────────
cat > "$REPORT" << EOF
# BNotes Blog Audit Report
**掃描時間：** $DATE
**工作目錄：** $ROOT

---
EOF

# ════════════════════════════════════════════════════════════════════════════
# CHECK 1: Sitemap vs dist 比對
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 1: Sitemap 完整性"
echo "## CHECK 1: Sitemap 完整性" >> "$REPORT"

# Extract slugs from sitemap
SITEMAP_SLUGS=$(grep '<loc>' "$DIST/sitemap.xml" | grep '/articles/' \
  | sed 's|.*articles/||;s|</loc>||;s|\.html||' | sort)

# Extract slugs from dist/articles (exclude index.html)
DIST_SLUGS=$(ls "$ARTICLES"/*.html 2>/dev/null | grep -v '/index.html' \
  | xargs -I{} basename {} .html | sort)

# Ghost entries (in sitemap but no file)
GHOSTS=$(comm -23 <(echo "$SITEMAP_SLUGS") <(echo "$DIST_SLUGS"))
if [ -n "$GHOSTS" ]; then
  while IFS= read -r slug; do
    fail "Ghost sitemap entry (no HTML): $slug"
    echo "- ❌ Ghost: \`$slug\`" >> "$REPORT"
  done <<< "$GHOSTS"
else
  ok "No ghost sitemap entries"
  echo "- ✅ 無幽靈條目" >> "$REPORT"
fi

# Missing from sitemap (file exists but not in sitemap)
MISSING=$(comm -13 <(echo "$SITEMAP_SLUGS") <(echo "$DIST_SLUGS"))
if [ -n "$MISSING" ]; then
  while IFS= read -r slug; do
    warn "Article not in sitemap: $slug"
    echo "- ⚠️ 未入 sitemap：\`$slug\`" >> "$REPORT"
  done <<< "$MISSING"
else
  ok "All articles in sitemap"
  echo "- ✅ 所有文章已入 sitemap" >> "$REPORT"
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 2: 首頁重複 slug
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 2: 首頁重複 slug"
echo -e "\n## CHECK 2: 首頁重複 slug" >> "$REPORT"

# Each <article> card is one line and has 2 hrefs internally — take first per line, then find cross-line dups
DUPS=$(grep '<article' "$DIST/index.html" \
  | grep -o 'href="/articles/[^"]*\.html"' \
  | awk '!seen[$0]++' \
  | sort | uniq -d \
  | grep -v "' + slug + '")
if [ -n "$DUPS" ]; then
  while IFS= read -r dup; do
    fail "Duplicate card on index: $dup"
    echo "- ❌ 重複卡片：\`$dup\`" >> "$REPORT"
  done <<< "$DUPS"
else
  ok "No duplicate cards on index"
  echo "- ✅ 首頁無重複卡片" >> "$REPORT"
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 3: Further-reading 死連結
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 3: Further-reading 死連結"
echo -e "\n## CHECK 3: Further-reading 死連結" >> "$REPORT"

DEAD_COUNT=0
for f in "$ARTICLES"/*.html; do
  fname=$(basename "$f")
  # Extract hrefs from further-reading sections
  hrefs=$(grep -A50 'further-reading\|延伸閱讀' "$f" 2>/dev/null \
    | grep -o 'href="/articles/[^"]*"' \
    | sed 's|href="||;s|"$||')
  while IFS= read -r href; do
    [ -z "$href" ] && continue
    target="$DIST$href"
    # Also try with .html suffix
    target_html="${target%.html}.html"
    if [ ! -f "$target" ] && [ ! -f "$target_html" ]; then
      fail "Dead link in $fname → $href"
      echo "- ❌ \`$fname\` → \`$href\`" >> "$REPORT"
      ((DEAD_COUNT++))
    fi
  done <<< "$hrefs"
done
[ $DEAD_COUNT -eq 0 ] && { ok "No dead further-reading links"; echo "- ✅ 無死連結" >> "$REPORT"; }

# ════════════════════════════════════════════════════════════════════════════
# CHECK 4: Schema 型別驗證
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 4: Schema 型別"
echo -e "\n## CHECK 4: Schema 型別" >> "$REPORT"

NEWS_COUNT=$(grep -rl '"@type": "NewsArticle"' "$ARTICLES" 2>/dev/null | wc -l | tr -d ' ')
if [ "$NEWS_COUNT" -gt 0 ]; then
  fail "$NEWS_COUNT articles still using NewsArticle schema"
  grep -rl '"@type": "NewsArticle"' "$ARTICLES" | xargs basename | \
    while read f; do echo "- ❌ NewsArticle：\`$f\`" >> "$REPORT"; done
else
  ok "All articles use Article schema"
  echo "- ✅ 全部使用 Article schema" >> "$REPORT"
fi

# ════════════════════════════════════════════════════════════════════════════
# CHECK 5: Hero 圖片缺漏
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 5: Hero 圖片缺漏"
echo -e "\n## CHECK 5: Hero 圖片缺漏" >> "$REPORT"

MISSING_IMG=0
for f in "$ARTICLES"/*.html; do
  slug=$(basename "$f" .html)
  [ "$slug" = "index" ] && continue
  img="$IMAGES/${slug}-hero.jpg"
  if [ ! -f "$img" ]; then
    fail "Missing hero image: $slug"
    echo "- ❌ 缺圖：\`$slug\`" >> "$REPORT"
    ((MISSING_IMG++))
  fi
done
[ $MISSING_IMG -eq 0 ] && { ok "All articles have hero images"; echo "- ✅ 全部有圖" >> "$REPORT"; }

# ════════════════════════════════════════════════════════════════════════════
# CHECK 6: 圖片提示詞品質（< 25字 = 弱）
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 6: 圖片提示詞品質"
echo -e "\n## CHECK 6: 圖片提示詞品質（< 25字 = 需升級）" >> "$REPORT"

WEAK_SLUGS=""
# Extract SLUG_SEARCH_TERMS — use temp file to avoid subshell counter issue
WEAK_TMP=$(mktemp)
grep -E "^\s+'[a-z].*':\s+'.*'," "$SCRIPTS/generate-hero-image.js" 2>/dev/null | \
while IFS= read -r line; do
  slug=$(echo "$line" | sed "s/^\s*'//;s/':.*//" )
  prompt=$(echo "$line" | sed "s/.*'[a-z][^']*':[[:space:]]*'//;s/'[,]*\s*$//")
  word_count=$(echo "$prompt" | wc -w | tr -d ' ')
  if [ "$word_count" -lt 25 ]; then
    echo "${word_count}|${slug}|${prompt}" >> "$WEAK_TMP"
  fi
done
if [ -s "$WEAK_TMP" ]; then
  while IFS='|' read -r wc slug prompt; do
    warn "Weak prompt (${wc} words): $slug"
    echo "- ⚠️ 弱提示詞（${wc}字）：\`$slug\`" >> "$REPORT"
    ((WARNINGS++))
  done < "$WEAK_TMP"
else
  ok "All prompts ≥ 25 words"
  echo "- ✅ 所有提示詞達標" >> "$REPORT"
fi
rm -f "$WEAK_TMP"

# ════════════════════════════════════════════════════════════════════════════
# CHECK 7: 9 元素結構完整性
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 7: 9 元素結構完整性"
echo -e "\n## CHECK 7: 9 元素結構完整性" >> "$REPORT"

STRUCT_ISSUES=0
for f in "$ARTICLES"/*.html; do
  slug=$(basename "$f" .html)
  [ "$slug" = "index" ] && continue
  missing_elements=()
  grep -q 'bnotes-cover\|article-summary' "$f" || missing_elements+=("摘要框")
  grep -q 'geo-box\|地理資訊' "$f" || missing_elements+=("geo-box")
  grep -q 'references\|參考資料' "$f" || missing_elements+=("references")
  grep -q 'further-reading\|延伸閱讀' "$f" || missing_elements+=("further-reading")
  grep -q 'affiliate\|推薦商品\|聯盟' "$f" || missing_elements+=("affiliate")
  if [ ${#missing_elements[@]} -gt 0 ]; then
    warn "$slug 缺少：${missing_elements[*]}"
    echo "- ⚠️ \`$slug\` 缺：${missing_elements[*]}" >> "$REPORT"
    ((STRUCT_ISSUES++))
  fi
done
[ $STRUCT_ISSUES -eq 0 ] && { ok "All articles have complete 9-element structure"; echo "- ✅ 全部 9 元素完整" >> "$REPORT"; }

# ════════════════════════════════════════════════════════════════════════════
# CHECK 8: Meta description 長度與唯一性
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 8: Meta description 品質"
echo -e "\n## CHECK 8: Meta description 品質" >> "$REPORT"

META_ISSUES=0
META_TMP=$(mktemp)
for f in "$ARTICLES"/*.html; do
  slug=$(basename "$f" .html)
  [ "$slug" = "index" ] && continue
  meta=$(grep -o 'name="description" content="[^"]*"' "$f" | sed 's/name="description" content="//;s/"$//')
  len=${#meta}
  if [ "$len" -lt 20 ]; then
    fail "$slug: meta description too short (${len} chars)"
    echo "- ❌ \`$slug\` meta 太短（${len} 字）" >> "$REPORT"
    ((META_ISSUES++))
  elif [ "$len" -gt 80 ]; then
    warn "$slug: meta description too long (${len} Chinese chars, Google shows ~53)"
    echo "- ⚠️ \`$slug\` meta 太長（${len} 字，Google 顯示約 53 中文字）" >> "$REPORT"
    ((META_ISSUES++))
  fi
  echo "$meta" >> "$META_TMP"
done
# Duplicate meta check using sort | uniq -d
DUP_METAS=$(sort "$META_TMP" | uniq -d | wc -l | tr -d ' ')
if [ "$DUP_METAS" -gt 0 ]; then
  fail "$DUP_METAS duplicate meta descriptions found"
  echo "- ❌ ${DUP_METAS} 條重複 meta description" >> "$REPORT"
  ((META_ISSUES++))
fi
rm -f "$META_TMP"
[ $META_ISSUES -eq 0 ] && { ok "All meta descriptions OK"; echo "- ✅ Meta descriptions 品質達標" >> "$REPORT"; }

# ════════════════════════════════════════════════════════════════════════════
# CHECK 9: 內容主題覆蓋率（世界級咖啡部落格標準）
# ════════════════════════════════════════════════════════════════════════════
hdr "CHECK 9: 世界級內容覆蓋率"
echo -e "\n## CHECK 9: 世界級內容覆蓋率" >> "$REPORT"

check_topic() {
  local topic="$1"; local keywords="$2"
  local found=0
  for kw in $keywords; do
    ls "$ARTICLES"/*${kw}*.html 2>/dev/null | grep -q . && found=1 && break
  done
  if [ $found -eq 0 ]; then
    warn "Coverage gap: $topic"
    echo "- ⚠️ 覆蓋缺口：**$topic**" >> "$REPORT"
    ((WARNINGS++))
  else
    ok "Covered: $topic"
    echo "- ✅ 已覆蓋：$topic" >> "$REPORT"
  fi
}

# 產地覆蓋
check_topic "衣索比亞" "ethiopia"
check_topic "肯亞" "kenya"
check_topic "哥倫比亞" "colombia"
check_topic "巴拿馬" "panama geisha"
check_topic "巴西" "brazil brasil"
check_topic "瓜地馬拉" "guatemala"
check_topic "台灣產地" "alishan taiwan-coffee"
check_topic "葉門" "yemen yemeni"

# 沖煮方式覆蓋
check_topic "手沖/V60" "pour-over v60"
check_topic "冷萃" "cold-brew"
check_topic "義式濃縮" "espresso"
check_topic "法式壓壺" "french-press"
check_topic "愛樂壓" "aeropress"
check_topic "土耳其咖啡" "turkish"
check_topic "氮氣冷萃" "nitro"

# ════════════════════════════════════════════════════════════════════════════
# CHECK 10: 視覺掃描提示（每月觸發）
# ════════════════════════════════════════════════════════════════════════════
if [[ "$*" == *"--visual"* ]] || [ "$(date +%d)" -le "07" ] && [ "$(date +%u)" -eq "1" ]; then
  hdr "CHECK 10: 視覺掃描清單（本月待驗）"
  echo -e "\n## CHECK 10: 本月視覺掃描清單" >> "$REPORT"
  echo "以下文章的 Hero 圖需 GM 目視驗證：" >> "$REPORT"
  ls "$ARTICLES"/*.html | grep -v index | xargs -I{} basename {} .html | \
    while read slug; do
      echo "- [ ] $slug" >> "$REPORT"
    done
  warn "Monthly visual scan triggered — see AUDIT_REPORT.md for checklist"
fi

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════"
echo -e " 掃描結果：${RED}$ISSUES 個問題${NC} | ${YELLOW}$WARNINGS 個警告${NC}"
echo "════════════════════════════════════════"

cat >> "$REPORT" << EOF

---
## 掃描摘要
- **問題（需立即修復）：** $ISSUES 個
- **警告（建議改善）：** $WARNINGS 個
- **報告產生時間：** $DATE

> GM 自主掃描系統 v1.0 — 每週一 09:03 自動觸發
EOF

echo ""
echo " 完整報告：05_Scripts/AUDIT_REPORT.md"
echo ""

# Exit code reflects severity
[ $ISSUES -gt 0 ] && exit 1 || exit 0
