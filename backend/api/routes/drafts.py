from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_db
from core.models import Draft, DraftStatus, Post, SentReply, User
from api.deps import get_current_user
from api.schemas import DraftOut, DraftPatch
from agents.send import send_reply

router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.get("", response_model=list[DraftOut])
async def list_drafts(
    status: Optional[DraftStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(Draft)
        .where(Draft.user_id == current_user.id)
        .order_by(Draft.created_at.desc())
    )
    if status is not None:
        q = q.where(Draft.status == status)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/{draft_id}", response_model=DraftOut)
async def update_draft(
    draft_id: int,
    patch: DraftPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id, Draft.user_id == current_user.id)
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if patch.status is not None:
        draft.status = patch.status
    if patch.draft_text is not None:
        draft.draft_text = patch.draft_text
    await db.commit()
    await db.refresh(draft)
    return draft


@router.post("/{draft_id}/approve", response_model=DraftOut)
async def approve_draft(
    draft_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id, Draft.user_id == current_user.id)
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    draft.status = DraftStatus.approved
    await db.commit()
    await db.refresh(draft)
    return draft


@router.post("/{draft_id}/send", response_model=DraftOut)
async def send_draft(
    draft_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    draft_result = await db.execute(
        select(Draft).where(Draft.id == draft_id, Draft.user_id == current_user.id)
    )
    draft = draft_result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status != DraftStatus.approved:
        raise HTTPException(status_code=400, detail="Draft must be approved before sending")

    post_result = await db.execute(select(Post).where(Post.id == draft.post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    tweet_url = f"https://x.com/{post.author_handle}/status/{post.tweet_id}"

    result = await send_reply(tweet_url, draft.draft_text)
    if not result["success"]:
        raise HTTPException(status_code=422, detail=result["error"])

    draft.status = DraftStatus.sent
    db.add(SentReply(draft_id=draft.id, user_id=current_user.id, tweet_url=tweet_url))
    await db.commit()
    await db.refresh(draft)
    return draft
