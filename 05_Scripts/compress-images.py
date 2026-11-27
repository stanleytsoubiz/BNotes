#!/usr/bin/env python3
"""
BNotes image pipeline — compress-images.py

Purpose (automation layer, 2026-11-26):
  Image compression is a PIPELINE step for all future content, not a manual chore.
  Every hero / in-body image that enters dist/images must pass through this script
  (or an equivalent) before publish, and must satisfy the performance budget below.

Performance budget (see 10_策略文件/BNotes_效能預算_v1.0.md):
  - Hero images:        WebP, max width 1408px, quality 80, target <= 300 KB
  - In-body images:     WebP, max width 1200px, quality 80, target <= 200 KB
  - Card thumbnails:    served from the hero file with width/height attributes + lazy loading
  - Homepage:           only the hero visual + first-row cards may be loading="eager";
                        total eager payload target <= 1.5 MB after compression

Usage:
  python3 05_Scripts/compress-images.py <input-image> [<input-image> ...]
  python3 05_Scripts/compress-images.py --dir dist/images/ai

Output: a .webp file next to the source (same basename). The script prints
before/after bytes and FAILS (exit 2) if a hero-sized image still exceeds
300 KB after compression, so CI / editors notice instead of silently shipping
megabyte images (the pre-2026 median hero was ~1.4 MB JPEG).

Requires: Pillow (pip install Pillow).
"""
import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Pillow is required: pip install Pillow", file=sys.stderr)
    sys.exit(1)

HERO_MAX_W = 1408
BODY_MAX_W = 1200
HERO_BUDGET = 300 * 1024
QUALITY = 80


def compress(path: str) -> tuple[int, int, str]:
    im = Image.open(path)
    w, h = im.size
    max_w = HERO_MAX_W if w > BODY_MAX_W else BODY_MAX_W
    if w > max_w:
        im = im.resize((max_w, round(h * max_w / w)), Image.LANCZOS)
    out = os.path.splitext(path)[0] + ".webp"
    im.convert("RGB").save(out, "WEBP", quality=QUALITY, method=6)
    return os.path.getsize(path), os.path.getsize(out), out


def main(argv: list[str]) -> int:
    targets: list[str] = []
    if "--dir" in argv:
        d = argv[argv.index("--dir") + 1]
        for root, _dirs, files in os.walk(d):
            for f in files:
                if f.lower().endswith((".jpg", ".jpeg", ".png")):
                    targets.append(os.path.join(root, f))
    else:
        targets = [a for a in argv if not a.startswith("--")]
    if not targets:
        print(__doc__)
        return 1
    failures = 0
    total_o = total_n = 0
    for t in sorted(targets):
        o, n, out = compress(t)
        total_o += o
        total_n += n
        flag = ""
        if n > HERO_BUDGET:
            flag = "  <-- OVER BUDGET (>300 KB)"
            failures += 1
        print(f"{t}: {o/1024:.0f} KB -> {out}: {n/1024:.0f} KB{flag}")
    print(f"TOTAL: {total_o/1024/1024:.2f} MB -> {total_n/1024/1024:.2f} MB "
          f"({total_n/total_o:.0%}) across {len(targets)} images")
    return 2 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
