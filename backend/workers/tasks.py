import asyncio
import hashlib
import logging

from sqlalchemy import select

from agents.draft import draft_reply
from agents.score import run_score
from agents.scout import run_scout
from core.db import AsyncSessionLocal
from core.models import Draft, DraftStatus, Post
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)

SCORE_THRESHOLD = 7.0
VOICE_PROFILE_VERSION = "v1"


def _tweet_id(handle: str, text: str) -> str:
    """Stable proxy for tweet ID: md5 of handle+text for deduplication across runs."""
    return hashlib.md5(f"{handle}:{text}".encode()).hexdigest()[:20]


async def _pipeline() -> dict:
    logger.info("Pipeline started")

    # 1. Scout: open X feed and screenshot 10 posts
    raw_posts = await run_scout(num_posts=10)
    logger.info("Scout captured %d posts", len(raw_posts))

    # 2. Score: extract content via vision and compute reply-worthiness
    scored_posts = run_score(raw_posts)
    logger.info("Scored %d posts", len(scored_posts))

    posts_persisted = 0
    drafts_created = 0

    async with AsyncSessionLocal() as session:
        # 3. Persist all scored posts, skipping duplicates
        db_posts: list[Post] = []
        for p in scored_posts:
            handle = p.get("handle") or ""
            text   = p.get("text") or ""
            tid    = _tweet_id(handle, text)

            existing = await session.scalar(select(Post).where(Post.tweet_id == tid))
            if existing:
                db_posts.append(existing)
                continue

            topics = p.get("topics") or []
            score_reason = (
                f"Topics: {', '.join(topics)}; "
                f"engagement score: {p.get('score', 0)}"
            )
            post = Post(
                tweet_id=tid,
                author_handle=handle.lstrip("@"),
                content=text,
                screenshot_path=p.get("screenshot_path"),
                score=p.get("score"),
                score_reason=score_reason,
            )
            session.add(post)
            db_posts.append(post)

        # Flush so new Post rows get their IDs before we reference them in drafts
        await session.flush()
        posts_persisted = len(db_posts)

        # 4. Filter to high-score posts and draft a reply for each new one
        eligible = [p for p in db_posts if p.score is not None and p.score >= SCORE_THRESHOLD]
        logger.info("%d/%d posts above threshold %.1f", len(eligible), posts_persisted, SCORE_THRESHOLD)

        for post in eligible:
            already_drafted = await session.scalar(
                select(Draft).where(Draft.post_id == post.id)
            )
            if already_drafted:
                continue

            draft_text = draft_reply(post)
            session.add(Draft(
                post_id=post.id,
                draft_text=draft_text,
                voice_profile_version=VOICE_PROFILE_VERSION,
                status=DraftStatus.pending,
            ))
            drafts_created += 1
            logger.info("Drafted reply for @%s (score %.1f)", post.author_handle, post.score)

        await session.commit()

    result = {
        "posts_captured": len(raw_posts),
        "posts_scored": len(scored_posts),
        "posts_persisted": posts_persisted,
        "drafts_created": drafts_created,
    }
    logger.info("Pipeline complete: %s", result)
    return result


@celery_app.task(name="workers.tasks.run_pipeline", bind=True, max_retries=2, default_retry_delay=300)
def run_pipeline(self) -> dict:
    try:
        return asyncio.run(_pipeline())
    except Exception as exc:
        logger.exception("Pipeline failed, retrying")
        raise self.retry(exc=exc)
