import secrets
import hashlib
import base64
from datetime import datetime, timezone, timedelta

import httpx
import jwt
import redis.asyncio as aioredis
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.voice import build_voice_profile
from core.config import settings
from core.db import get_db
from core.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize"
_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
_USERS_ME_URL = "https://api.twitter.com/2/users/me"
_SCOPES = "tweet.read users.read offline.access"
_COOKIE_SESSION = "session"
_SESSION_TTL_DAYS = 30


_REDIRECT_URI = "https://backend-production-1468.up.railway.app/auth/callback"


def _redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


def _redirect_uri(request: Request) -> str:
    return _REDIRECT_URI


def _make_jwt(user_id: int) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=_SESSION_TTL_DAYS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _decode_jwt(token: str) -> int:
    data = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    return int(data["sub"])


# ---------------------------------------------------------------------------
# GET /auth/twitter
# ---------------------------------------------------------------------------

@router.get("/twitter")
async def twitter_login(request: Request):
    code_verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

    state = secrets.token_urlsafe(16)

    async with _redis() as r:
        await r.set(f"pkce:{state}", code_verifier, ex=600)

    params = {
        "response_type": "code",
        "client_id": settings.twitter_client_id,
        "redirect_uri": _redirect_uri(request),
        "scope": _SCOPES,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    url = httpx.URL(_AUTHORIZE_URL).copy_with(params=params)

    return RedirectResponse(str(url))


# ---------------------------------------------------------------------------
# GET /auth/callback
# ---------------------------------------------------------------------------

@router.get("/callback")
async def twitter_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    async with _redis() as r:
        pkce_verifier = await r.getdel(f"pkce:{state}")
    if not pkce_verifier:
        raise HTTPException(status_code=400, detail="Missing or expired PKCE verifier")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": _redirect_uri(request),
                "client_id": settings.twitter_client_id,
                "code_verifier": pkce_verifier,
            },
            auth=(settings.twitter_client_id, settings.twitter_client_secret),
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Token exchange failed")

    token_data = token_resp.json()
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token", "")
    expires_in = token_data.get("expires_in", 7200)
    token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Fetch user info
    async with httpx.AsyncClient() as client:
        me_resp = await client.get(
            _USERS_ME_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if me_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch user info")

    me = me_resp.json()["data"]
    x_user_id: str = me["id"]
    x_handle: str = me["username"]

    # Upsert user row
    result = await db.execute(select(User).where(User.x_user_id == x_user_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            x_user_id=x_user_id,
            x_handle=x_handle,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
        )
        db.add(user)
    else:
        user.x_handle = x_handle
        user.access_token = access_token
        user.refresh_token = refresh_token
        user.token_expires_at = token_expires_at

    voice_profile = await build_voice_profile(access_token, x_user_id)
    user.voice_profile = voice_profile

    await db.commit()
    await db.refresh(user)

    jwt_token = _make_jwt(user.id)
    return RedirectResponse(f"https://replyguy.aryasomu.com?token={jwt_token}")


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get("/me")
async def me(
    request: Request,
    db: AsyncSession = Depends(get_db),
    session: str | None = Cookie(default=None),
):
    token: str | None = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    elif session:
        token = session
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user_id = _decode_jwt(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"id": user.id, "x_handle": user.x_handle}


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

@router.post("/logout")
async def logout():
    response = JSONResponse({"ok": True})
    response.delete_cookie(_COOKIE_SESSION)
    return response
