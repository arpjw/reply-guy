import anthropic
from pathlib import Path
from core.config import settings
from core.models import Post

VOICE_FILE = Path(__file__).parent.parent / "voice" / "tweets.txt"

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _load_tweets() -> str:
    lines = VOICE_FILE.read_text(encoding="utf-8").splitlines()
    return "\n".join(f"• {l.strip()}" for l in lines if l.strip())


def draft_reply(post: Post) -> str:
    voice_samples = _load_tweets()
    system = f"""You are ghostwriting a reply on X (Twitter) that must sound exactly like the author of these sample tweets. Study them carefully — vocabulary, sentence length, rhythm, what they do and do not say.

Sample tweets:
{voice_samples}

Rules for the reply:
- Under 280 characters
- Sounds indistinguishable from the author — not like an AI
- Never starts with "I"
- Engages directly with the substance, adds an angle the original post doesn't state
- No filler: no "Great point", "Love this", "Fascinating", no AI-speak
- Return only the reply text, nothing else"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=[{
            "role": "user",
            "content": (
                f"Post to reply to:\n{post.content}\n\n"
                f"Why it's reply-worthy: {post.score_reason or 'high engagement, relevant topic'}"
            ),
        }],
    )
    return response.content[0].text.strip()


def run_draft(posts: list[Post], top_n: int = 3) -> list[tuple[Post, str]]:
    top = sorted(
        [p for p in posts if p.score is not None],
        key=lambda p: p.score,
        reverse=True,
    )[:top_n]

    results = []
    for post in top:
        print(f"Drafting reply for @{post.author_handle} (score: {post.score})...")
        draft = draft_reply(post)
        print(f"  Draft: {draft}\n")
        results.append((post, draft))

    return results
