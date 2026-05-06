import jwt
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.db import get_db
from core.models import User


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    session: str | None = Cookie(default=None),
) -> User:
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        data = jwt.decode(session, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(data["sub"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
