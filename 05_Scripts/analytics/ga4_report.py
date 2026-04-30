#!/usr/bin/env python3
"""
BNotes GA4 自動報告腳本
用途：拉取 GA4 關鍵指標，供 CEO 週報/月報使用
認證：Google Service Account JSON 金鑰
"""

import os, sys, json
from datetime import datetime, timedelta

# ── Config ────────────────────────────────────────────────────────────────────
PROPERTY_ID = "534093231"   # BNotes Coffee GA4 Property ID
KEY_FILE = os.path.join(os.path.dirname(__file__), "service_account.json")
# ─────────────────────────────────────────────────────────────────────────────

def get_client():
    """建立 GA4 Data API 客戶端"""
    import warnings
    warnings.filterwarnings("ignore")
    
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.oauth2 import service_account

    if not os.path.exists(KEY_FILE):
        print("❌ 找不到 service_account.json")
        print(f"   請將 Google Service Account 金鑰放至：{KEY_FILE}")
        sys.exit(1)

    creds = service_account.Credentials.from_service_account_file(
        KEY_FILE,
        scopes=["https://www.googleapis.com/auth/analytics.readonly"]
    )
    return BetaAnalyticsDataClient(credentials=creds)

def pull_weekly_data(client, days=7):
    """拉取本週關鍵數據"""
    from google.analytics.data_v1beta.types import (
        RunReportRequest, DateRange, Metric, Dimension, FilterExpression, Filter
    )

    end   = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    prop  = f"properties/{PROPERTY_ID}"

    results = {}

    # 1. Sessions + 停留時間 + 跳出率
    req = RunReportRequest(
        property=prop,
        date_ranges=[DateRange(start_date=start, end_date=end)],
        metrics=[
            Metric(name="sessions"),
            Metric(name="averageSessionDuration"),
            Metric(name="bounceRate"),
            Metric(name="newUsers"),
        ],
    )
    r = client.run_report(req)
    if r.rows:
        row = r.rows[0].metric_values
        results["sessions"]          = int(row[0].value)
        results["avg_session_sec"]   = round(float(row[1].value))
        results["bounce_rate"]       = f"{float(row[2].value)*100:.1f}%"
        results["new_users"]         = int(row[3].value)

    # 2. 自訂事件：affiliate_click + outbound_click（總數）
    # 注意：affiliate_product 自訂維度需在 GA4 後台登記後才能細分
    req2 = RunReportRequest(
        property=prop,
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimensions=[Dimension(name="eventName")],
        metrics=[Metric(name="eventCount")],
        dimension_filter=FilterExpression(
            filter=Filter(
                field_name="eventName",
                string_filter=Filter.StringFilter(
                    value="affiliate_click|outbound_click",
                    match_type=Filter.StringFilter.MatchType.FULL_REGEXP
                )
            )
        ),
    )
    r2 = client.run_report(req2)
    affiliate = {}
    for row in r2.rows:
        evt   = row.dimension_values[0].value
        count = int(row.metric_values[0].value)
        affiliate[evt] = count
    results["affiliate_clicks"] = affiliate

    # 3. article_read_complete + newsletter_signup
    req3 = RunReportRequest(
        property=prop,
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimensions=[Dimension(name="eventName")],
        metrics=[Metric(name="eventCount")],
        dimension_filter=FilterExpression(
            filter=Filter(
                field_name="eventName",
                string_filter=Filter.StringFilter(
                    value="article_read_complete|newsletter_signup",
                    match_type=Filter.StringFilter.MatchType.FULL_REGEXP
                )
            )
        ),
    )
    r3 = client.run_report(req3)
    for row in r3.rows:
        evt   = row.dimension_values[0].value
        count = int(row.metric_values[0].value)
        results[evt] = count

    # 4. 流量來源
    req4 = RunReportRequest(
        property=prop,
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        metrics=[Metric(name="sessions")],
    )
    r4 = client.run_report(req4)
    sources = {}
    total = 0
    for row in r4.rows:
        ch  = row.dimension_values[0].value
        cnt = int(row.metric_values[0].value)
        sources[ch] = cnt
        total += cnt
    organic = sources.get("Organic Search", 0)
    results["organic_pct"] = f"{organic/total*100:.1f}%" if total else "0%"
    results["traffic_sources"] = sources

    return results

def format_weekly_report(data, period_days=7):
    """格式化週報輸出"""
    affiliate = data.get("affiliate_clicks", {})
    aff_total = affiliate.get("affiliate_click", 0)
    outbound  = affiliate.get("outbound_click", 0)
    aff_detail = f"affiliate_click: {aff_total} | outbound_click: {outbound}" if aff_total or outbound else "0"

    avg_min = data.get("avg_session_sec", 0) // 60
    avg_sec = data.get("avg_session_sec", 0) % 60

    now_str = datetime.now().strftime("%Y-%m-%d")

    report = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 BNotes 週報 | {now_str}（近 {period_days} 天）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【🔴 變現指標】
  聯盟連結總點擊：{aff_total} 次
  ├─ {aff_detail}
  /gear.html 另查 GA4 頁面報告

【🟡 內容品質】
  平均停留時間：{avg_min}分{avg_sec}秒
  跳出率：{data.get('bounce_rate', 'N/A')}
  文章讀完（article_read_complete）：{data.get('article_read_complete', 0)} 次

【🟢 成長指標】
  Sessions：{data.get('sessions', 0)}
  新用戶：{data.get('new_users', 0)}
  自然搜尋佔比：{data.get('organic_pct', 'N/A')}
  Newsletter 訂閱：{data.get('newsletter_signup', 0)} 次

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    return report.strip()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "weekly"
    print("🔄 連接 GA4...", flush=True)
    client = get_client()
    print("✅ 連接成功\n")

    days = 30 if mode == "monthly" else 7
    data = pull_weekly_data(client, days=days)
    print(format_weekly_report(data, period_days=days))
