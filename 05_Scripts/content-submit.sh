#!/bin/bash
# BNotes Content Submit Script
# 用法：bash 05_Scripts/content-submit.sh "08_文章_Articles_HTML/[slug].html" "commit message"
FILE=$1
MSG=$2
cd "/Users/stanleytsou/Library/Mobile Documents/com~apple~CloudDocs/Skywork AI/BNotes_完整知識庫_2026_b70125664b1e40e3a606b89bbd238f5c"
git add "$FILE"
git commit -m "$MSG"
echo "Committed: $(git rev-parse --short HEAD)"
