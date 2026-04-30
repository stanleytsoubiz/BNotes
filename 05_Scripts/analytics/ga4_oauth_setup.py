#!/usr/bin/env python3
"""
BNotes GA4 OAuth 一次性設定工具
執行一次 → 瀏覽器授權 → token 永久儲存 → 之後全自動
"""
import os, json, sys, warnings
warnings.filterwarnings("ignore")

TOKEN_FILE = os.path.join(os.path.dirname(__file__), "ga4_token.json")
CLIENT_FILE = os.path.join(os.path.dirname(__file__), "oauth_client.json")

def setup():
    """一次性 OAuth 授權"""
    if not os.path.exists(CLIENT_FILE):
        print("\n" + "="*60)
        print("BNotes GA4 OAuth 設定")
        print("="*60)
        print("\n需要 Google Cloud OAuth 憑證（client_id + client_secret）")
        print("請依以下步驟操作（約 3 分鐘）：")
        print()
        print("① 開啟：https://console.cloud.google.com/apis/credentials")
        print("② 點「+ 建立憑證」→「OAuth 用戶端 ID」")
        print("③ 應用程式類型：選「電腦版應用程式」")
        print("④ 名稱：BNotes Analytics")
        print("⑤ 建立後下載 JSON，重新命名為 oauth_client.json")
        print(f"⑥ 放至：{CLIENT_FILE}")
        print()
        print("⚠️  首次使用前，請先在 Google Cloud Console 啟用：")
        print("   https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com")
        sys.exit(0)

    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            print("✅ Token 自動更新成功")
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_FILE, SCOPES)
            creds = flow.run_local_server(port=8765)
            print("✅ 授權成功！")
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return creds

def list_properties(creds):
    """列出所有 GA4 屬性，找出 BNotes 的 Property ID"""
    from google.analytics.admin import AnalyticsAdminServiceClient
    client = AnalyticsAdminServiceClient(credentials=creds)
    
    print("\n📋 你的 GA4 屬性清單：")
    print("-" * 50)
    for account in client.list_accounts():
        for prop in client.list_properties(filter=f"parent:{account.name}"):
            prop_id = prop.name.split("/")[1]
            print(f"  屬性 ID: {prop_id} | {prop.display_name}")
            if "bnotes" in prop.display_name.lower() or "coffee" in prop.display_name.lower():
                print(f"  ★ 這可能是 BNotes 屬性 → Property ID = {prop_id}")
    print("-" * 50)

if __name__ == "__main__":
    creds = setup()
    list_properties(creds)
    print("\n✅ 設定完成！記下 BNotes 的 Property ID，更新 ga4_report.py 的 PROPERTY_ID 變數。")
