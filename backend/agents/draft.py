import anthropic
import json
from core.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

VOICE_CORPUS = """
Arya Somu's writing style:
- Concise and direct, no filler words
- Confident but not arrogant
- Thinks in systems and frameworks
- Interested in macro, quant finance, AI, and institutional dynamics
- Uses precise language, avoids vague generalities
- Short punchy sentences mixed with longer analytical ones
- Never uses em dashes
- No excessive punctuation or exclamation marks
- Engages with the actual substance of a post, not just the surface
- Adds a specific angle or data point others haven't mentioned
- Sounds like a sharp 19 year old who actually knows what he's talking about
"""

def draft_reply(post: dict) -> str:
    prompt = f"""You are ghostwriting a reply for Arya Somu on X (Twitter).

Here is Arya's voice and style:
{VOICE_CORPUS}

Here is the post to reply to:
Handle: {post.get('handle')}
Text: {post.get('text')}
Topics: {post.get('topics')}

Write ONE reply that:
- Is under 280 characters
- Adds a specific angle, insight, or data point
- Sounds exactly like Arya's voice
- Does not start with "I" or the person's handle
- Is not sycophantic ("great point", "love this", etc.)
- Gets straight to the substance

Return only the reply text, nothing else."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()

def run_draft(scored_posts: list[dict], top_n: int = 3) -> list[dict]:
    top = [p for p in scored_posts if not p.get("is_ad") and p.get("score", 0) > 20][:top_n]
    
    results = []
    for post in top:
        print(f"Drafting reply for {post.get('handle')} (score: {post.get('score')})...")
        draft = draft_reply(post)
        post["draft_reply"] = draft
        results.append(post)
        print(f"  Draft: {draft}\n")
    
    return results

if __name__ == "__main__":
    from agents.scout import run_scout
    from agents.score import run_score
    import asyncio

    print("Scouting...")
    posts = asyncio.run(run_scout(num_posts=5))
    
    print("Scoring...")
    scored = run_score(posts)
    
    print("\nDrafting replies...\n")
    drafted = run_draft(scored, top_n=3)
    
    print("\nFinal output:")
    for p in drafted:
        print(f"POST: {p.get('handle')} -- {p.get('text', '')[:100]}")
        print(f"REPLY: {p.get('draft_reply')}")
        print(f"SCORE: {p.get('score')}")
        print()