#!/usr/bin/env python3
"""
BNotes Scheduled Article Publisher v2
======================================
功能升級：
1. 自動發布：掃描 _scheduled/，date <= 今天 → 搬移至 articles/（含逾期補發）
2. 強制發布：--force-slug SLUG 指定單篇立刻發布（無論日期）
3. 強制全部：--force-all 將所有 _scheduled 文章立刻全部發布
4. 輸出清單：寫入 /tmp/published_articles.txt 供 workflow commit 使用
"""

import os, re, sys, shutil
from datetime import date
from pathlib import Path

today      = date.today()
scheduled  = Path("dist/_scheduled")
articles   = Path("dist/articles")
published  = []

# ── 讀取命令列參數 ─────────────────────────────────────────────
force_slug = None   # --force-slug espresso-ratio-science
force_all  = False  # --force-all

args = sys.argv[1:]
for i, a in enumerate(args):
    if a == "--force-slug" and i + 1 < len(args):
        force_slug = args[i + 1].removesuffix(".html")
    if a == "--force-all":
        force_all = True

print(f"[publisher v2] 日期: {today}")
print(f"[publisher v2] 模式: {'force-all' if force_all else ('force-slug=' + force_slug) if force_slug else 'auto'}")
print(f"[publisher v2] 掃描: {scheduled}")
print()

for html_path in sorted(scheduled.glob("*.html")):
    content = html_path.read_text(encoding="utf-8")
    slug    = html_path.stem

    # 從 YAML frontmatter 解析 date
    m = re.search(r"^date:\s*(.+)$", content[:600], re.MULTILINE)
    if not m:
        print(f"  [skip]    {html_path.name} — 無法解析 date")
        continue

    try:
        pub_date = date.fromisoformat(m.group(1).strip().strip('"').strip("'")[:10])
    except ValueError:
        print(f"  [skip]    {html_path.name} — date 格式錯誤: {m.group(1)}")
        continue

    days_left = (pub_date - today).days

    # 判斷是否要發布
    should_publish = (
        force_all                          # --force-all
        or (force_slug and slug == force_slug)  # --force-slug 指定
        or pub_date <= today               # 自動：到期或逾期
    )

    if should_publish:
        dest = articles / html_path.name
        shutil.copy2(str(html_path), str(dest))
        html_path.unlink()
        published.append(html_path.name)
        tag = "逾期" if days_left < 0 else ("今日" if days_left == 0 else "強制")
        print(f"  [publish] {html_path.name}  ({pub_date}) [{tag}]")
    else:
        print(f"  [wait]    {html_path.name}  ({pub_date})  還有 {days_left} 天")

# 寫出發布清單
changed_file = Path("/tmp/published_articles.txt")
if published:
    changed_file.write_text("\n".join(published))
    print(f"\n[publisher v2] ✅ 本次發布 {len(published)} 篇：")
    for name in published:
        print(f"   - {name}")
else:
    changed_file.unlink(missing_ok=True)
    print(f"\n[publisher v2] 今天沒有到期文章。")
