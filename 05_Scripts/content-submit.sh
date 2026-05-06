#!/bin/bash
# BNotes Content Submit Script v2.0
# 用法：bash 05_Scripts/content-submit.sh <slug> "commit message"
# 範例：bash 05_Scripts/content-submit.sh espresso-ratio-science "feat(content): Batch6升級三元素"
#
# 自動處理：
#   1. git add 08_文章_Articles_HTML/<slug>.html
#   2. git add -f dist/articles/<slug>.html  (dist 在 .gitignore，必須 -f)
#   3. git commit with Co-Author

SLUG=$1
MSG=$2
ROOT="/Users/stanleytsou/Library/Mobile Documents/com~apple~CloudDocs/Skywork AI/BNotes_完整知識庫_2026_b70125664b1e40e3a606b89bbd238f5c"

if [ -z "$SLUG" ] || [ -z "$MSG" ]; then
  echo "用法：bash 05_Scripts/content-submit.sh <slug> \"commit message\""
  echo "範例：bash 05_Scripts/content-submit.sh espresso-ratio-science \"feat(content): 升級\""
  exit 1
fi

cd "$ROOT"

SRC="08_文章_Articles_HTML/${SLUG}.html"
DIST="dist/articles/${SLUG}.html"

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

git commit -m "${MSG}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

echo "✅ committed: $(git rev-parse --short HEAD)"
