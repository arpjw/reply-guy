import asyncio
from fastapi import APIRouter

from core.db import AsyncSessionLocal
from core.models import Draft, DraftStatus, Post

router = APIRouter(tags=["workers"])


@router.post("/run-scout")
async def run_scout_endpoint():
    asyncio.create_task(_run_pipeline())
    return {"status": "started"}


async def _run_pipeline():
    from agents.scout import run_scout
    from agents.score import run_score
    from agents.draft import run_draft

    async with AsyncSessionLocal() as db:
        try:
            raw_posts = await run_scout(num_posts=10)
            scored = await asyncio.to_thread(run_score, raw_posts)

            post_models = []
            for p in scored:
                post = Post(
                    tweet_id=p["screenshot_path"],
                    author_handle=p.get("handle", "unknown"),
                    content=p.get("text", ""),
                    screenshot_path=p.get("screenshot_path"),
                    score=p.get("score"),
                )
                db.add(post)
                post_models.append(post)
            await db.commit()
            for post in post_models:
                await db.refresh(post)

            drafts_data = await asyncio.to_thread(run_draft, post_models, 3)

            for post, draft_text in drafts_data:
                draft = Draft(
                    post_id=post.id,
                    draft_text=draft_text,
                    voice_profile_version="v1",
                    status=DraftStatus.pending,
                )
                db.add(draft)
            await db.commit()
        except Exception as e:
            print(f"[pipeline error] {e}")
