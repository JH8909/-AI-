"""
1688 public search/detail provider.
No login, CAPTCHA bypass, stealth, or proxy handling is attempted.
"""

import asyncio
import random
import re
from typing import Any
from urllib.parse import quote, urlparse

from bs4 import BeautifulSoup


BLOCK_MARKERS = ("验证码", "captcha", "登录", "请登录", "滑块", "安全验证")


class PlatformBlockedError(RuntimeError):
    """Raised when 1688 returns a login, CAPTCHA, or block page."""


def is_blocked_html(html: str) -> bool:
    text = BeautifulSoup(html or "", "lxml").get_text(" ", strip=True).lower()
    return any(marker.lower() in text for marker in BLOCK_MARKERS)


def extract_offer_id(url: str) -> str | None:
    match = re.search(r"/offer/(\d+)", urlparse(url).path)
    return match.group(1) if match else None


def parse_search_results(html: str, keyword: str, limit: int = 50) -> list[dict[str, Any]]:
    if is_blocked_html(html):
      raise PlatformBlockedError("1688 returned a login or CAPTCHA page")

    soup = BeautifulSoup(html or "", "lxml")
    cards = soup.select("[data-offer-id], .offer, .sm-offer, .component-offer")
    if not cards:
        cards = soup.select("a[href*='detail.1688.com/offer/']")

    results: list[dict[str, Any]] = []
    seen: set[str] = set()
    for card in cards:
        link = card if card.name == "a" else card.select_one("a[href*='detail.1688.com/offer/']")
        href = link.get("href") if link else ""
        if href and href.startswith("//"):
            href = "https:" + href
        offer_id = card.get("data-offer-id") or extract_offer_id(href or "")
        if not href or not offer_id or offer_id in seen:
            continue
        seen.add(offer_id)

        title_el = card.select_one("[title], .title, .offer-title") or link
        title = (title_el.get("title") if title_el and title_el.has_attr("title") else title_el.get_text(" ", strip=True) if title_el else "").strip()
        price_text = card.get_text(" ", strip=True)
        price_match = re.search(r"(?:¥|￥|RMB)?\s*(\d+(?:\.\d+)?)", price_text)
        image = card.select_one("img")
        src = image.get("src") or image.get("data-src") if image else ""
        if src and src.startswith("//"):
            src = "https:" + src

        results.append({
            "external_id": offer_id,
            "name": title or f"1688商品 {offer_id}",
            "source_url": href,
            "source": "link_parse",
            "category": "other",
            "price": float(price_match.group(1)) if price_match else None,
            "cost": float(price_match.group(1)) if price_match else None,
            "images": [src] if src and src.startswith("http") else [],
            "tags": [keyword],
            "source_keyword": keyword,
            "radar_state": "candidate",
            "risk_level": "safe",
            "status": "draft",
        })
        if len(results) >= limit:
            break
    return results


async def fetch_search_results(keyword: str, limit: int = 50) -> list[dict[str, Any]]:
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:
        raise RuntimeError("Playwright 未安装：pip install playwright && playwright install chromium") from exc

    url = f"https://s.1688.com/selloffer/offer_search.htm?keywords={quote(keyword)}"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        })
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)
            html = await page.content()
            results = parse_search_results(html, keyword, limit=limit)
        finally:
            await browser.close()

    await asyncio.sleep(random.uniform(2, 5))
    return results
