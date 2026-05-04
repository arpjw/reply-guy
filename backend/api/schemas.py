from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from core.models import DraftStatus


class PostOut(BaseModel):
    id: int
    tweet_id: str
    author_handle: str
    content: str
    screenshot_path: Optional[str] = None
    score: Optional[float] = None
    score_reason: Optional[str] = None
    scraped_at: datetime

    model_config = {"from_attributes": True}


class DraftOut(BaseModel):
    id: int
    post_id: int
    draft_text: str
    voice_profile_version: str
    created_at: datetime
    status: DraftStatus

    model_config = {"from_attributes": True}


class DraftPatch(BaseModel):
    status: Optional[DraftStatus] = None
    draft_text: Optional[str] = None
