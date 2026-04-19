from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, Text
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from core.config import settings

Base = declarative_base()

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Run(Base):
    __tablename__ = "runs"
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    num_posts = Column(Integer)
    status = Column(String, default="pending")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer)
    handle = Column(String)
    display_name = Column(String)
    text = Column(Text)
    score = Column(Float)
    likes = Column(Integer)
    retweets = Column(Integer)
    replies = Column(Integer)
    views = Column(Integer)
    screenshot_path = Column(String)
    draft_reply = Column(Text)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_ad = Column(Boolean, default=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session