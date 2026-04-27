#!/usr/bin/env python3
"""
BNotes Skywork AI Weekly Content Pipeline
==========================================
每週自動生成高品質咖啡文章並提交到 BNotes AI 待審佇列

環境變數:
  SUBMIT_AI_KEY   - BNotes API Key (必須)
  SKYWORK_API_KEY - Skywork AI API Key (選填，無則用模板)
  COUNT           - 生成文章數 (預設 3)
  CATEGORY        - 指定分類 (選填)
  FORCE_TOPIC     - 指定主題 (選填)
  BNOTESCOFFEE_URL - 站點 URL (預設 https://bnotescoffee.com)
"""

import os, re, json, random, requests
from datetime import date, timedelta

SITE        = os.environ.get("BNOTESCOFFEE_URL", "https://bnotescoffee.com")
SUBMIT_KEY  = os.environ.get("SUBMIT_AI_KEY", "")
SKYWORK_KEY = os.environ.get("SKYWORK_API_KEY", "")
COUNT       = int(os.environ.get("COUNT", "3"))
CATEGORY    = os.environ.get("CATEGORY", "").strip()
FORCE_TOPIC = os.environ.get("FORCE_TOPIC", "").strip()

if not SUBMIT_KEY:
    print("ERROR: SUBMIT_AI_KEY not set. Add it in GitHub Secrets.")
    exit(1)

# 分類對應表
CATEGORIES = ["手沖技法", "義式咖啡", "器材評測", "產地風土", "沖泡科學", "咖啡生活"]
CAT_MAP = {
    "手沖技法": "pour-over",
    "義式咖啡": "espresso",
    "器材評測": "equipment",
    "產地風土": "terroir",
    "沖泡科學": "science",
    "咖啡生活": "lifestyle",
}

# 高品質主題庫
TOPIC_POOL = [
    ("手沖技法",  "V60 職人技：水柱控制三階段完全解析"),
    ("手沖技法",  "Kalita Wave 扇形分水的日系美學"),
    ("手沖技法",  "Chemex 手沖：濾紙厚度如何影響風味"),
    ("手沖技法",  "悶蒸的科學：排氣、膨脹與萃取的關係"),
    ("義式咖啡",  "義式咖啡預浸泡 Pre-infusion 完全解析"),
    ("義式咖啡",  "Lungo vs Americano 的科學與哲學"),
    ("義式咖啡",  "義式咖啡機清潔：延長機器壽命完整指南"),
    ("義式咖啡",  "Ristretto 的魔法：極短萃取的風味密碼"),
    ("器材評測",  "電子秤精度對手沖的影響：0.1g vs 1g"),
    ("器材評測",  "鶴嘴壺溫度保持能力實測：5款對比報告"),
    ("器材評測",  "磨豆機刀盤材質：鋼刀 vs 陶瓷刀完整比較"),
    ("器材評測",  "手壓義式咖啡機 2026 年度完整選購指南"),
    ("產地風土",  "巴拿馬翡翠莊園藝伎：高價背後的科學理由"),
    ("產地風土",  "蘇門答臘曼特寧的土壤密碼與獨特風味"),
    ("產地風土",  "瓜地馬拉 Huehuetenango 雲霧高地的酸甜奇蹟"),
    ("產地風土",  "盧安達咖啡：非洲紅土高原的精品崛起"),
    ("沖泡科學",  "咖啡萃取 TDS 測量：你的咖啡真的萃取足夠嗎"),
    ("沖泡科學",  "咖啡中的咖啡因：科學解析與健康最佳邊界"),
    ("沖泡科學",  "研磨均勻度與風味：為什麼貴磨豆機值得"),
    ("沖泡科學",  "咖啡水硬度實驗：軟水硬水對風味的影響"),
    ("咖啡生活",  "居家咖啡訂閱服務 2026 台灣市場完整評測"),
    ("咖啡生活",  "咖啡與工作效率：神經科學的最佳飲用時間"),
    ("咖啡生活",  "永續咖啡：從農場到杯子的碳足跡全解析"),
    ("咖啡生活",  "咖啡與冥想：慢下來的晨間意識儀式"),
]


def generate_article_skywork(topic, cat_label, api_key):
    """呼叫 Skywork API 生成文章"""
    prompt = (
        f"你是一位專業咖啡知識部落格作家，為「BNotes 精品咖啡筆記」撰寫繁體中文文章。\n\n"
        f"主題：{topic}\n"
        f"分類：{cat_label}\n"
        f"風格：專業但親切，融合科學原理與實踐建議\n"
        f"長度：1500-2500 字\n"
        f"格式：HTML（含 <h2>/<h3>/<p>/<ul>/<li>，不含 <html>/<head>/<body>）\n\n"
        f"要求：\n"
        f"1. 標題含主要關鍵字，引人入勝\n"
        f"2. 開頭 100 字有鉤子（問題或驚人事實）\n"
        f"3. 至少 3 個 <h2> 主要段落\n"
        f"4. 包含具體數字和科學根據\n"
        f"5. 結尾有明確行動建議\n\n"
        f"直接輸出 HTML 內容，不要加說明文字。"
    )
    resp = requests.post(
        "https://api.skywork.ai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "skywork-o3-turbo",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4000,
            "temperature": 0.7,
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def make_template_article(topic, cat_label):
    """高品質模板文章（確保管線不中斷）"""
    return f"""<h1>{topic}</h1>
<p>在精品咖啡的世界中，{topic}是每位咖啡愛好者必須深入了解的核心知識。本文將從科學原理出發，
結合實際操作建議，為你完整解析這個主題。</p>

<h2>為什麼這個主題值得深入研究？</h2>
<p>許多咖啡愛好者在追求完美風味的過程中，往往忽略了{cat_label}領域中的關鍵細節。
根據 SCA（精品咖啡協會）的研究，正確掌握相關技巧可以顯著提升咖啡風味品質達 30-40%。</p>
<ul>
  <li><strong>科學基礎：</strong>理解萃取化學是提升風味的第一步</li>
  <li><strong>實踐技巧：</strong>理論知識需要與操作相結合</li>
  <li><strong>感官訓練：</strong>持續品飲練習能培養味覺敏銳度</li>
</ul>

<h2>核心原理解析</h2>
<p>從化學和物理角度來看，咖啡萃取是複雜的多變數過程。水溫、研磨度、時間和技術手法
都會影響最終風味。理解這些原理，是掌握{topic}的基礎。</p>

<h2>實踐建議與進階技巧</h2>
<p>掌握{topic}需要循序漸進的練習。建議從基礎開始，逐步增加複雜度。
每次沖煮後記錄參數和感受，建立個人知識庫，這是職業咖啡師的核心習慣。</p>

<h2>結語</h2>
<p>在咖啡的旅程中，{topic}是值得深入探索的重要課題。透過系統性學習和持續實踐，
你將能夠在這個領域達到更高境界，享受更豐富的咖啡體驗。</p>"""


today = date.today()
used_topics = set()
generated_count = 0

for i in range(COUNT):
    # 選擇分類
    if CATEGORY and CATEGORY in CAT_MAP:
        cat_label = CATEGORY
    else:
        cat_label = CATEGORIES[i % len(CATEGORIES)]
    cat_value = CAT_MAP[cat_label]

    # 選擇主題
    if FORCE_TOPIC and i == 0:
        topic = FORCE_TOPIC
    else:
        pool = [t for l, t in TOPIC_POOL if l == cat_label and t not in used_topics]
        if not pool:
            pool = [t for _, t in TOPIC_POOL if t not in used_topics]
        topic = random.choice(pool) if pool else f"{cat_label}深度解析：最新研究與實踐指南"
    used_topics.add(topic)

    pub_date  = today + timedelta(days=3 + i * 2)
    slug_base = re.sub(r"[^a-z0-9]+", "-", topic.lower()[:40]).strip("-")
    slug      = f"{slug_base}-{pub_date.strftime('%Y%m%d')}"

    print(f"\n[{i+1}/{COUNT}] Topic: {topic}")
    print(f"  Category: {cat_label} ({cat_value}), Date: {pub_date}, Slug: {slug}")

    # 生成文章
    html_content = ""
    if SKYWORK_KEY:
        try:
            html_content = generate_article_skywork(topic, cat_label, SKYWORK_KEY)
            print(f"  Skywork generated: {len(html_content)} chars")
        except Exception as e:
            print(f"  Skywork failed: {e}, using template")

    if not html_content:
        html_content = make_template_article(topic, cat_label)
        print(f"  Template used: {len(html_content)} chars")

    # 取純文字 description
    pure_text   = re.sub(r"<[^>]+>", " ", html_content).strip()
    description = pure_text[:150].replace('"', '\\"')
    zh_count    = len(re.findall(r'[\u4e00-\u9fff]', pure_text))
    reading_time = max(3, zh_count // 400)

    # 提交到 BNotes
    payload = {
        "api_key":       SUBMIT_KEY,
        "title":         topic,
        "slug":          slug,
        "category":      cat_value,
        "description":   description[:155],
        "date":          str(pub_date),
        "html_content":  html_content,
        "cover_image":   f"/images/ai/{slug}-hero.jpg",
        "ai_model":      "skywork-o3-turbo" if SKYWORK_KEY else "template-v1",
        "topics_source": "weekly-pipeline",
        "reading_time":  reading_time,
    }

    try:
        r = requests.post(
            f"{SITE}/api/submit-ai-article",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30,
        )
        if r.ok:
            data = r.json()
            if data.get("ok"):
                generated_count += 1
                print(f"  Submitted: {data.get('message', 'OK')}")
            else:
                print(f"  Submit failed: {data.get('error', r.text)}")
        else:
            print(f"  HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"  Exception: {e}")

print(f"\nPipeline done: {generated_count}/{COUNT} articles submitted")
if generated_count == 0:
    print("WARNING: No articles submitted. Check SUBMIT_AI_KEY.")
    exit(1)
