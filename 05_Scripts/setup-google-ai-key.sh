#!/bin/bash
# BNotes｜Google AI Key 一鍵部署到 Cloudflare Pages
# 使用方式：bash 05_Scripts/setup-google-ai-key.sh

PROJECT="bnotes"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  BNotes｜Google AI Key 部署到 Cloudflare Pages      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "📋 取得 API Key 步驟："
echo "   1. 開啟 Google AI Studio → https://aistudio.google.com/apikey"
echo "   2. 點擊右上角「Create API key」"
echo "   3. 建立名稱為「BNotes」的新 key"
echo "   4. 複製完整的 API Key"
echo ""
read -p "✏️  請貼上你的 Google AI Key：" GOOGLE_KEY
echo ""

if [ -z "$GOOGLE_KEY" ]; then
  echo "❌ Key 為空，取消部署"
  exit 1
fi

echo "🚀 正在部署到 Cloudflare Pages（bnotes 專案）..."
cd "$ROOT_DIR"
echo "$GOOGLE_KEY" | npx wrangler pages secret put GOOGLE_AI_KEY --project-name "$PROJECT"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ GOOGLE_AI_KEY 已成功部署到 Cloudflare Pages!"
  echo ""
  echo "📷 現在可以執行 Imagen 3 生圖："
  echo "   GOOGLE_AI_KEY=$GOOGLE_KEY node 05_Scripts/generate-hero-image.js --missing"
  echo ""
  echo "   （--missing 只處理缺圖文章，現有好圖卡不受影響）"
else
  echo "❌ 部署失敗，請確認 Cloudflare API Token 有效"
fi
