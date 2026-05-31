#!/bin/bash
# BNotes Content Submit Script v2.0
# 用法：bash 05_Scripts/content-submit.sh <slug> "commit message"
# 範例：bash 05_Scripts/content-submit.sh espresso-ratio-science "feat(content): Batch6升級三元素"
#
# 自動處理：
#   1. git add 08_文章_Articles_HTML/<slug>.html
#   2. git add -f dist/articles/<slug>.html  (dist 在 .gitignore，必須 -f)
#   3. git add -f dist/images/ai/<slug>-hero.jpg  (文章圖卡必須同步部署)
#   4. git commit with Co-Author

SLUG=$1
MSG=$2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$SLUG" ] || [ -z "$MSG" ]; then
  echo "用法：bash 05_Scripts/content-submit.sh <slug> \"commit message\""
  echo "範例：bash 05_Scripts/content-submit.sh espresso-ratio-science \"feat(content): 升級\""
  exit 1
fi

cd "$ROOT"

SRC="08_文章_Articles_HTML/${SLUG}.html"
DIST="dist/articles/${SLUG}.html"
HERO="dist/images/ai/${SLUG}-hero.jpg"

if [ ! -f "$SRC" ]; then
  echo "❌ 找不到來源檔案：$SRC"
  exit 1
fi

git add "$SRC"
echo "✅ staged src: $SRC"

if [ -f "$DIST" ]; then
  git add -f "$DIST"
  echo "✅ staged dist: $DIST"
else
  echo "⚠️  dist 不存在，跳過：$DIST"
fi

if [ -f "$HERO" ]; then
  git add -f "$HERO"
  echo "✅ staged hero: $HERO"
else
  echo "⚠️  hero 圖不存在，請確認圖卡 Gate：$HERO"
fi

git commit -m "${MSG}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

echo "✅ committed: $(git rev-parse --short HEAD)"
