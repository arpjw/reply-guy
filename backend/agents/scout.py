import asyncio
import base64
import os
from pathlib import Path
from datetime import datetime
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path("screenshots")
SCREENSHOTS_DIR.mkdir(exist_ok=True)

async def launch_browser(playwright):
    is_railway = os.environ.get("RAILWAY_ENVIRONMENT") is not None
    args = ["--no-sandbox", "--disable-blink-features=AutomationControlled"]
    if is_railway:
        args += ["--disable-dev-shm-usage", "--disable-gpu"]
    browser = await playwright.chromium.launch(
        headless=is_railway,
        args=args
    )
    context = await browser.new_context(
        viewport={"width": 1280, "height": 900},
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        storage_state="session.json"
    )
    await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return browser, context

async def login(page, username: str, password: str):
    await page.goto("https://x.com/login", wait_until="domcontentloaded")
    await asyncio.sleep(2)

    input_field = page.locator('input[name="text"]')
    await input_field.wait_for(state="visible")
    await input_field.click()
    await asyncio.sleep(0.3)
    await input_field.fill(username)
    await asyncio.sleep(0.5)

    await page.locator('[role="button"]').filter(has_text="Next").click()
    await asyncio.sleep(3)

    await page.screenshot(path="screenshots/debug_after_username.png")
    print("Screenshot saved")

async def screenshot_post(page, index: int) -> dict:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = SCREENSHOTS_DIR / f"post_{index}_{timestamp}.png"
    await page.screenshot(path=str(path), full_page=False)
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return {"index": index, "path": str(path), "b64": b64, "timestamp": timestamp}

async def get_tweet_id_from_article(article) -> str | None:
    links = await article.query_selector_all('a[href*="/status/"]')
    for link in links:
        href = await link.get_attribute('href')
        if href and '/status/' in href:
            parts = href.split('/status/')
            if len(parts) > 1:
                tid = parts[1].split('/')[0].split('?')[0]
                if tid.isdigit():
                    return tid
    return None


async def scroll_feed(page, num_posts: int = 10) -> list[dict]:
    await page.goto("https://x.com/home", wait_until="domcontentloaded")
    await asyncio.sleep(2)

    posts = []
    seen_tweet_ids: set[str] = set()
    processed_count = 0
    last_height = 0

    while len(posts) < num_posts:
        articles = await page.query_selector_all("article")
        for article in articles[processed_count:]:
            if len(posts) >= num_posts:
                break
            processed_count += 1
            tweet_id = await get_tweet_id_from_article(article)
            if tweet_id and tweet_id in seen_tweet_ids:
                continue
            await article.scroll_into_view_if_needed()
            await asyncio.sleep(0.8)
            post_data = await screenshot_post(page, len(posts))
            if tweet_id:
                post_data["tweet_id"] = tweet_id
                seen_tweet_ids.add(tweet_id)
            posts.append(post_data)

        current_height = await page.evaluate("document.body.scrollHeight")
        if current_height == last_height:
            break
        last_height = current_height
        await asyncio.sleep(1.2)

    return posts

async def run_scout(num_posts: int = 10) -> list[dict]:
    async with async_playwright() as playwright:
        browser, context = await launch_browser(playwright)
        page = await context.new_page()
        try:
            posts = await scroll_feed(page, num_posts)
            return posts
        finally:
            await browser.close()

if __name__ == "__main__":
    results = asyncio.run(run_scout(num_posts=5))
    print(f"Captured {len(results)} posts")
    for r in results:
        print(f"  [{r['index']}] {r['path']}")