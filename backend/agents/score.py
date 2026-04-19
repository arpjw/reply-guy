import anthropic
import base64
import json
from pathlib import Path
from core.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

def encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")

def extract_post(screenshot_path: str) -> dict:
    b64 = encode_image(screenshot_path)
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": """Extract the first post visible in this X (Twitter) screenshot.
Return ONLY a JSON object with these fields:
{
  "handle": "@username",
  "display_name": "Display Name",
  "text": "full post text",
  "likes": 0,
  "retweets": 0,
  "replies": 0,
  "views": 0,
  "age": "e.g. 2h",
  "is_ad": false,
  "has_media": false,
  "topics": ["topic1", "topic2"]
}
If the post is an ad set is_ad to true. Return only valid JSON, no markdown."""
                    }
                ],
            }
        ],
    )
    raw = response.content[0].text.strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)

def score_post(post: dict) -> float:
    if post.get("is_ad"):
        return 0.0

    topic_keywords = [
        "macro", "fed", "rates", "inflation", "markets", "quant",
        "trading", "finance", "ai", "research", "startups", "crypto",
        "systematic", "equity", "bonds", "yields", "etf", "options"
    ]

    text = (post.get("text") or "").lower()
    topics = [t.lower() for t in post.get("topics") or []]

    topic_score = sum(1 for kw in topic_keywords if kw in text or any(kw in t for t in topics))
    topic_score = min(topic_score / 3, 1.0)

    views = post.get("views") or 0
    likes = post.get("likes") or 0
    replies = post.get("replies") or 0

    momentum_score = 0.0
    if views > 0:
        engagement_rate = (likes + replies) / views
        momentum_score = min(engagement_rate * 20, 1.0)

    reply_gap_score = 0.0
    if likes > 100 and replies < likes * 0.05:
        reply_gap_score = 1.0
    elif replies < 10:
        reply_gap_score = 0.6

    composite = (
        topic_score * 0.45 +
        momentum_score * 0.25 +
        reply_gap_score * 0.30
    )

    return round(composite * 100, 1)

def run_score(posts: list[dict]) -> list[dict]:
    results = []
    for post in posts:
        path = post.get("path")
        if not path or not Path(path).exists():
            continue
        print(f"Extracting post {post['index']}...")
        extracted = extract_post(path)
        extracted["screenshot_path"] = path
        extracted["index"] = post["index"]
        extracted["score"] = score_post(extracted)
        results.append(extracted)
        print(f"  {extracted.get('handle')} | score: {extracted['score']}")

    results.sort(key=lambda x: x["score"], reverse=True)
    return results

if __name__ == "__main__":
    from agents.scout import run_scout
    import asyncio

    print("Running scout...")
    posts = asyncio.run(run_scout(num_posts=5))
    print(f"Captured {len(posts)} posts\n")

    print("Scoring posts...")
    scored = run_score(posts)

    print("\nTop posts:")
    for p in scored:
        print(f"  [{p['score']}] {p.get('handle')} -- {p.get('text', '')[:80]}")