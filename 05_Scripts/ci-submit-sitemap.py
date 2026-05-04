#!/usr/bin/env python3
"""
BNotes CI Sitemap Submitter
GitHub Actions 專用：從環境變數讀取 service account JSON
用法：python3 05_Scripts/ci-submit-sitemap.py
環境變數：GSC_SERVICE_ACCOUNT_JSON（完整 JSON 字串）
"""
import warnings, json, subprocess, os, sys, tempfile
warnings.filterwarnings('ignore')

SITE_URL = "https://bnotescoffee.com/"
SITEMAP_URL = "https://bnotescoffee.com/sitemap.xml"
INDEXNOW_KEY = "4c5bbd8accc0d62f986790f5eb4818e5"

success_count = 0

# ── 1. Google Search Console ────────────────────────────────
print("📡 [1/2] Google Search Console...")
sa_json = os.environ.get("GSC_SERVICE_ACCOUNT_JSON", "")
if not sa_json.strip():
    print("  ⚠️  GSC_SERVICE_ACCOUNT_JSON 未設定，跳過")
else:
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write(sa_json)
            sa_path = f.name

        creds = service_account.Credentials.from_service_account_file(
            sa_path, scopes=["https://www.googleapis.com/auth/webmasters"]
        )
        service = build("searchconsole", "v1", credentials=creds)
        service.sitemaps().submit(siteUrl=SITE_URL, feedpath=SITEMAP_URL).execute()
        print(f"  ✅ 已提交：{SITEMAP_URL}")
        success_count += 1
    except Exception as e:
        print(f"  ❌ 失敗：{e}")

# ── 2. Bing IndexNow ────────────────────────────────────────
print("📡 [2/2] Bing IndexNow...")
try:
    payload = json.dumps({
        "host": "bnotescoffee.com",
        "key": INDEXNOW_KEY,
        "keyLocation": "https://bnotescoffee.com/" + INDEXNOW_KEY + ".txt",
        "urlList": [SITEMAP_URL]
    })
    result = subprocess.run([
        "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
        "-X", "POST", "https://api.indexnow.org/IndexNow",
        "-H", "Content-Type: application/json; charset=utf-8",
        "-d", payload
    ], capture_output=True, text=True, timeout=15)
    code = result.stdout.strip()
    if code == "200":
        print(f"  ✅ HTTP {code}")
        success_count += 1
    else:
        print(f"  ⚠️  HTTP {code}")
except Exception as e:
    print(f"  ❌ 失敗：{e}")

print(f"\n{'✅' if success_count > 0 else '⚠️ '} 完成（{success_count}/2 成功）")
