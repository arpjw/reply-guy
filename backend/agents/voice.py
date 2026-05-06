import httpx

_TWEETS_URL = "https://api.twitter.com/2/users/{user_id}/tweets"


async def build_voice_profile(access_token: str, user_id: str) -> str:
    params = {
        "max_results": 100,
        "tweet.fields": "in_reply_to_user_id,text",
        "exclude": "retweets,replies",
    }
    tweets: list[str] = []

    async with httpx.AsyncClient() as client:
        # Fetch up to 200 tweets across two pages
        for _ in range(2):
            resp = await client.get(
                _TWEETS_URL.format(user_id=user_id),
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            if resp.status_code != 200:
                break
            data = resp.json()
            for tweet in data.get("data", []):
                text = tweet.get("text", "")
                # Belt-and-suspenders filter: skip retweets and replies
                if text.startswith("RT "):
                    continue
                if tweet.get("in_reply_to_user_id"):
                    continue
                tweets.append(text)
            next_token = data.get("meta", {}).get("next_token")
            if not next_token or len(tweets) >= 200:
                break
            params["pagination_token"] = next_token

    return "\n".join(tweets[:200])
