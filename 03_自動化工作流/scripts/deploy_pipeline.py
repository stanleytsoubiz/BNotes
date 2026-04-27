#!/usr/bin/env python3
"""BNotes Deploy Pipeline — Skywork AI content auto-deploy script
Handles: image localization, hero img injection, og:image sync, frontmatter sync
"""
import os, re, yaml, requests, base64, subprocess
from pathlib import Path
from PIL import Image
from io import BytesIO

SITE = "https://bnotescoffee.com"
AI_DIR = Path("dist/images/ai")
AI_DIR.mkdir(parents=True, exist_ok=True)

HERO_HTML = (
    '\n<div class="bnotes-hero-image" style="width:100%;max-height:480px;'
    'overflow:hidden;margin:0;padding:0;line-height:0;">\n'
    '  <img src="{img_url}" alt="{title}"\n'
    '       style="width:100%;height:480px;object-fit:cover;object-position:center;display:block;"\n'
    '       loading="eager" fetchpriority="high">\n'
    '</div>\n'
)

def localize_image(url, slug):
    local_fn  = f"{slug}-hero.jpg"
    local_p   = AI_DIR / local_fn
    local_rel = f"/images/ai/{local_fn}"
    if "unsplash.com" in url:
        url = url.split("?")[0] + "?w=1200&h=630&q=85&fit=crop&auto=format"
    try:
        r = requests.get(url, timeout=30, headers={"User-Agent": "BNotes-Bot/3.0"})
        r.raise_for_status()
        img = Image.open(BytesIO(r.content)).convert("RGB")
        w, h = img.size
        if w > 1200:
            img = img.resize((1200, int(h * (1200 / w))), Image.LANCZOS)
        buf = BytesIO()
        img.save(buf, "JPEG", quality=85, optimize=True)
        local_p.write_bytes(buf.getvalue())
        print(f"  [DL] {slug} → {local_rel} ({len(buf.getvalue())//1024}KB)")
        return local_rel, str(local_p)
    except Exception as e:
        print(f"  [ERR] download failed: {e}")
        return url, None

def inject_hero(html, img_url, title):
    if re.search(r'class="[^"]*bnotes-hero-image[^"]*"', html):
        return html
    if re.search(r'class="[^"]*article-hero-img[^"]*"', html):
        return html
    hero = HERO_HTML.format(img_url=img_url, title=title.replace('"', '&quot;'))
    m = re.search(r"<body[^>]*>", html)
    if not m:
        return html
    ins = m.end()
    nav = re.search(r"</nav>|</header>", html[ins:ins+2000])
    if nav:
        ins += nav.end()
    return html[:ins] + hero + html[ins:]

def sync_og_image(html, url):
    html = re.sub(r'(property="og:image"\s+content=")[^"]*(")', lambda m: m.group(1)+url+m.group(2), html)
    html = re.sub(r'(content=")[^"]*("\s+property="og:image")', lambda m: m.group(1)+url+m.group(2), html)
    return html

def sync_jsonld(html, url):
    def patch(m):
        s = m.group(0)
        s = re.sub(r'("image":\s*\{[^}]*"url":\s*")[^"]*(")', lambda im: im.group(1)+url+im.group(2), s)
        return s
    return re.sub(r'<script type="application/ld\+json">.*?</script>', patch, html, flags=re.DOTALL)

# ── main ──────────────────────────────────────────────────────────
result = subprocess.run(["git","diff","--name-only","HEAD~1","HEAD"], capture_output=True, text=True)
modified = [f for f in result.stdout.strip().split("\n")
            if f.startswith("dist/articles/") and f.endswith(".html")]
print(f"[INFO] Modified articles: {modified}")

changed_files = []

for filepath in modified:
    p = Path(filepath)
    if not p.exists():
        continue
    content = p.read_text(encoding="utf-8")
    slug = p.stem

    fm = re.match(r"^(---\s*\n)(.*?)(\n---\s*\n)", content, re.DOTALL)
    if not fm:
        print(f"  [SKIP] {filepath} - no frontmatter")
        continue

    try:
        meta = yaml.safe_load(fm.group(2))
    except Exception:
        continue

    cover = (meta.get("cover_image") or "").strip().strip('"').strip("'")
    title = (meta.get("title") or slug).strip().strip('"')

    extra_file = None

    # A. Localize external image
    if cover.startswith("http"):
        cover, extra_file = localize_image(cover, slug)

    img_full = SITE + cover if cover.startswith("/") else cover

    # B. Update frontmatter
    new_fm = re.sub(r'(cover_image:\s*)"?[^"\n]+"?', f'cover_image: "{cover}"', fm.group(2), count=1)

    html = content[fm.end():]

    # C. Inject hero img if missing
    html = inject_hero(html, img_full, title)

    # D. Sync og:image
    html = sync_og_image(html, img_full)

    # E. Sync JSON-LD
    html = sync_jsonld(html, img_full)

    new_content = fm.group(1) + new_fm + fm.group(3) + html
    if new_content != content:
        p.write_text(new_content, encoding="utf-8")
        changed_files.append(filepath)
        print(f"  [OK] {slug}")

    if extra_file:
        changed_files.append(extra_file)

if changed_files:
    with open("/tmp/changed.txt", "w") as f:
        f.write("\n".join(set(changed_files)))
    print(f"\n[TOTAL] {len(set(changed_files))} files updated")
else:
    print("\n[TOTAL] nothing to update")
