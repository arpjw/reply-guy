import asyncio
import base64
import os
import re
import tempfile
from playwright.async_api import async_playwright


async def _launch_browser(playwright, session_path=None):
    browser = await playwright.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
    )
    context_kwargs = {
        "viewport": {"width": 1280, "height": 900},
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }
    if session_path:
        context_kwargs["storage_state"] = session_path
    context = await browser.new_context(**context_kwargs)
    await context.add_init_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    return browser, context


_RATE_LIMIT_PATTERNS = [
    r"you are over the daily limit",
    r"rate limit exceeded",
    r"too many requests",
    r"you.ve reached your limit",
    r"try again later",
    r"posting limit",
]

_CAPTCHA_PATTERNS = [
    r"verify you are human",
    r"arkose",
    r"funcaptcha",
    r"please verify",
]


def _check_rate_limited(text: str) -> bool:
    lower = text.lower()
    return any(re.search(p, lower) for p in _RATE_LIMIT_PATTERNS)


def _check_captcha(url: str, text: str) -> bool:
    if any(p in url.lower() for p in ("arkose", "funcaptcha", "captcha")):
        return True
    lower = text.lower()
    return any(re.search(p, lower) for p in _CAPTCHA_PATTERNS)


async def send_reply(tweet_url: str, reply_text: str) -> dict:
    session_path = None
    b64 = os.environ.get("SESSION_JSON_B64")
    if b64:
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
        tmp.write(base64.b64decode(b64).decode())
        tmp.close()
        session_path = tmp.name

    async with async_playwright() as playwright:
        browser, context = await _launch_browser(playwright, session_path)
        page = await context.new_page()
        try:
            await page.goto(tweet_url, wait_until="domcontentloaded", timeout=30_000)
            await asyncio.sleep(2)

            body_text = await page.inner_text("body")
            if _check_captcha(page.url, body_text):
                return {"success": False, "error": "captcha_detected"}
            if _check_rate_limited(body_text):
                return {"success": False, "error": "rate_limit"}

            # On a tweet detail page the reply composer is inline; try it first.
            # If not visible, fall back to clicking the reply icon on the tweet.
            reply_textarea = page.locator('[data-testid="tweetTextarea_0"]').first
            textarea_visible = await reply_textarea.is_visible()

            if not textarea_visible:
                reply_btn = page.locator('[data-testid="reply"]').first
                await reply_btn.click()
                await asyncio.sleep(1.5)
                reply_textarea = page.locator('[data-testid="tweetTextarea_0"]').first

            await reply_textarea.wait_for(state="visible", timeout=10_000)
            await reply_textarea.click()
            await asyncio.sleep(0.3)
            # type() simulates keystrokes, more reliable for contenteditable
            await reply_textarea.type(reply_text, delay=30)
            await asyncio.sleep(0.5)

            body_text = await page.inner_text("body")
            if _check_rate_limited(body_text):
                return {"success": False, "error": "rate_limit"}

            # Inline reply composer uses tweetButtonInline; modal uses tweetButton
            post_btn = page.locator('[data-testid="tweetButtonInline"]').first
            if not await post_btn.is_visible():
                post_btn = page.locator('[data-testid="tweetButton"]').first

            await post_btn.wait_for(state="visible", timeout=5_000)
            await post_btn.click()
            await asyncio.sleep(2)

            body_text = await page.inner_text("body")
            if _check_captcha(page.url, body_text):
                return {"success": False, "error": "captcha_detected"}
            if _check_rate_limited(body_text):
                return {"success": False, "error": "rate_limit"}

            return {"success": True, "error": None}

        except Exception as exc:
            return {"success": False, "error": str(exc)}
        finally:
            await browser.close()
