import anthropic
from core.config import settings
from core.models import Post

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _format_voice(voice_profile: str) -> str:
    return "\n".join(f"• {l.strip()}" for l in voice_profile.splitlines() if l.strip())


def draft_reply(post: Post, voice_profile: str) -> str:
    voice_samples = _format_voice(voice_profile)
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


def run_draft(posts: list[Post], voice_profile: str, top_n: int = 3) -> list[tuple[Post, str]]:
    top = sorted(
        [p for p in posts if p.score is not None],
        key=lambda p: p.score,
        reverse=True,
    )[:top_n]

    results = []
    for post in top:
        print(f"Drafting reply for @{post.author_handle} (score: {post.score})...")
        draft = draft_reply(post, voice_profile)
        print(f"  Draft: {draft}\n")
        results.append((post, draft))

    return results
