import re
import httpx


def _extract_tweet_id(tweet_url: str) -> str:
    match = re.search(r'/status/(\d+)', tweet_url)
    if not match:
        raise ValueError(f"Could not extract tweet ID from URL: {tweet_url}")
    return match.group(1)


async def send_reply(tweet_url: str, reply_text: str, access_token: str) -> dict:
    try:
        tweet_id = _extract_tweet_id(tweet_url)
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.twitter.com/2/tweets",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "text": reply_text,
                    "reply": {"in_reply_to_tweet_id": tweet_id},
                },
                timeout=30,
            )
        print(f"SEND: X API response {resp.status_code} {resp.text}", flush=True)
        if resp.status_code in (200, 201):
            return {"success": True, "error": None}
        return {"success": False, "error": f"X API error {resp.status_code}: {resp.text}"}
    except Exception as exc:
        print(f"SEND ERROR: {exc}", flush=True)
        return {"success": False, "error": str(exc)}
