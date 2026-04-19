import asyncio
import json
from playwright.async_api import async_playwright

async def save_session():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        
        with open("cookies.json", "r") as f:
            cookies = json.load(f)
        
        for cookie in cookies:
            cookie.pop("sameSite", None)
            cookie.pop("hostOnly", None)
            cookie.pop("session", None)
            cookie.pop("storeId", None)
            cookie["domain"] = cookie.get("domain", ".x.com")
        
        await context.add_cookies(cookies)
        await context.storage_state(path="session.json")
        print("Session saved.")
        await browser.close()

asyncio.run(save_session())