#!/bin/bash
# BNotes GA4 自動報告執行器
# 由 CEO 週報/月報 Cron 自動呼叫

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-weekly}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "BNotes GA4 報告 | $(date '+%Y-%m-%d %H:%M')"
echo "模式：$MODE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

python3 "$SCRIPT_DIR/ga4_report.py" "$MODE"
