#!/bin/bash

# BNotes Backend Auto-Deploy Script
# Simple deployment: push code and let GitHub Actions handle the rest

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_URL="https://bnotescoffee.com/admin/articles"
API_URL="https://bnotescoffee.com/admin/articles-data"

# Function to print colored output
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_info "🚀 BNotes Backend Deployment Started"
echo ""

# Step 1: Ensure we're in the project directory
cd "$PROJECT_DIR"
log_info "Project directory: $PROJECT_DIR"

# Step 2: Check git status
log_info "Checking for changes to deploy..."

if git diff-index --quiet HEAD --; then
  log_warn "No changes detected in working directory"
  echo ""
  echo "Note: You can still deploy by:"
  echo "  1. Making changes to backend code"
  echo "  2. Running: bash scripts/deploy-backend.sh"
  exit 0
fi

# Step 3: Stage and commit changes
log_info "Committing changes..."
git add -A
git commit -m "🚀 Auto-deploy backend system ($(date '+%Y-%m-%d %H:%M:%S'))"
log_success "Changes committed"

# Step 4: Push to main branch
log_info "Pushing to GitHub main branch..."
git push origin main
log_success "Code pushed to GitHub"

# Step 5: Wait for deployment
log_info "Waiting for GitHub Actions to deploy (60 seconds)..."
sleep 60

# Step 6: Verify deployment
log_info "Verifying backend system..."

MAX_ATTEMPTS=20
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))

  RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL" 2>/dev/null || echo "\n0")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"ok":true' 2>/dev/null; then
    log_success "✅ Backend system is ONLINE and responding!"
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "🎉 DEPLOYMENT SUCCESSFUL"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "📍 Backend URLs:"
    echo "   Dashboard: $BACKEND_URL"
    echo "   API: $API_URL"
    echo ""
    echo "🔐 Login Credentials:"
    echo "   Password: BNotes2026"
    echo "   Session: 8 hours"
    echo ""
    echo "✨ Backend Features Ready:"
    echo "   ✓ Published Articles Tab"
    echo "   ✓ Scheduled Articles Tab"
    echo "   ✓ AI-Pending Articles Tab"
    echo "   ✓ Article Management (Edit, Delete, Copy)"
    echo "   ✓ Quality Scan & Batch Operations"
    echo "   ✓ Search & Filter"
    echo ""
    exit 0
  fi

  if [ $ATTEMPT -eq 1 ]; then
    log_info "Backend starting up... (This may take a minute)"
  fi

  if [ $((ATTEMPT % 5)) -eq 0 ]; then
    log_info "Still waiting... (Attempt $ATTEMPT/$MAX_ATTEMPTS)"
  fi

  sleep 5
done

log_warn "⏱️  Backend verification timeout"
echo ""
echo "The backend may still be deploying. Check:"
echo "  1. GitHub Actions: https://github.com/stanleytsoubiz/BNotes/actions"
echo "  2. Cloudflare Pages: https://dash.cloudflare.com/"
echo "  3. Try accessing: $BACKEND_URL"
echo ""
exit 1
