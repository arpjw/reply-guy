import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum

from core.db import Base


class DraftStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    sent = "sent"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    x_user_id = Column(String, unique=True, nullable=False)
    x_handle = Column(String, nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)
    voice_profile = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    tweet_id = Column(String, unique=True, nullable=False)
    author_handle = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    screenshot_path = Column(String)
    score = Column(Float)
    score_reason = Column(Text)
    scraped_at = Column(DateTime, default=datetime.utcnow)


class Draft(Base):
    __tablename__ = "drafts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    draft_text = Column(Text, nullable=False)
    voice_profile_version = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(DraftStatus), default=DraftStatus.pending, nullable=False)


class SentReply(Base):
    __tablename__ = "sent_replies"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    draft_id = Column(Integer, ForeignKey("drafts.id"), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    tweet_url = Column(String, nullable=False)
