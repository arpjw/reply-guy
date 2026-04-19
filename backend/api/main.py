from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import init_db, get_db, Run, Post
from contextlib import asynccontextmanager
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Reply Guy", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/runs")
async def create_run(db: AsyncSession = Depends(get_db)):
    run = Run(status="running", num_posts=10)
    db.add(run)
    await db.commit()
    await db.refresh(run)

    asyncio.create_task(execute_run(run.id, db))
    return {"run_id": run.id, "status": "started"}

@app.get("/runs")
async def list_runs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).order_by(Run.created_at.desc()))
    return result.scalars().all()

@app.get("/runs/{run_id}/posts")
async def get_posts(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Post).where(Post.run_id == run_id).order_by(Post.score.desc())
    )
    return result.scalars().all()

@app.patch("/posts/{post_id}/status")
async def update_post_status(post_id: int, status: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post:
        post.status = status
        await db.commit()
    return {"status": status}

async def execute_run(run_id: int, db: AsyncSession):
    from agents.scout import run_scout
    from agents.score import run_score
    from agents.draft import run_draft

    try:
        posts = await run_scout(num_posts=10)
        scored = run_score(posts)
        drafted = run_draft(scored, top_n=5)

        for p in drafted:
            post = Post(
                run_id=run_id,
                handle=p.get("handle"),
                display_name=p.get("display_name"),
                text=p.get("text"),
                score=p.get("score"),
                likes=p.get("likes"),
                retweets=p.get("retweets"),
                replies=p.get("replies"),
                views=p.get("views"),
                screenshot_path=p.get("screenshot_path"),
                draft_reply=p.get("draft_reply"),
                is_ad=p.get("is_ad", False),
            )
            db.add(post)

        result = await db.execute(select(Run).where(Run.id == run_id))
        run = result.scalar_one()
        run.status = "complete"
        await db.commit()

    except Exception as e:
        result = await db.execute(select(Run).where(Run.id == run_id))
        run = result.scalar_one()
        run.status = f"error: {str(e)}"
        await db.commit()