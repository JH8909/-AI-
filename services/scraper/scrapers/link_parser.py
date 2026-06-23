"""
单链接解析器 — 使用 Playwright 解析商品页面
仅支持无需登录的公开页面
"""

import re
from typing import Any


SUPPORTED_DOMAINS = {
    "detail.1688.com": "1688",
    "item.taobao.com": "taobao",
    "detail.tmall.com": "tmall",
    "mobile.yangkeduo.com": "pdd",
    "item.jd.com": "jd",
}


async def parse_link(url: str) -> dict[str, Any] | None:
    """
    解析单个商品链接

    Args:
        url: 商品页 URL

    Returns:
        标准化产品字典，或 None
    """
    # Check if domain is supported
    from urllib.parse import urlparse
    domain = urlparse(url).netloc.lower()

    platform = None
    for supported, name in SUPPORTED_DOMAINS.items():
        if supported in domain:
            platform = name
            break

    if not platform:
        print(f"[警告] 不支持的域名: {domain}")
        print(f"[提示] 支持的域名: {', '.join(SUPPORTED_DOMAINS.keys())}")
        return None

    # Use Playwright to fetch page
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("[错误] 请先安装 Playwright: pip install playwright && playwright install chromium")
        return None

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Set a reasonable user agent
        await page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            # Wait a bit for dynamic content
            await page.wait_for_timeout(2000)

            product = await _extract_product(page, url, platform)

        except Exception as e:
            print(f"[错误] 页面加载失败: {e}")
            product = None

        finally:
            await browser.close()

    return product


async def _extract_product(page, url: str, platform: str) -> dict[str, Any]:
    """从页面提取产品信息"""
    product: dict[str, Any] = {
        "name": "",
        "description": "",
        "category": "other",
        "price": None,
        "cost": None,
        "images": [],
        "specs": {},
        "tags": [],
        "source_url": url,
        "source": "link_parse",
    }

    # Common extraction logic
    # Title - try multiple selectors
    title_selectors = [
        'h1[data-testid="product-title"]',
        "h1",
        '[class*="title"]',
        'meta[property="og:title"]',
    ]
    for sel in title_selectors:
        try:
            if sel.startswith("meta"):
                content = await page.get_attribute(sel, "content")
                if content:
                    product["name"] = content.strip()
                    break
            else:
                el = await page.query_selector(sel)
                if el:
                    text = await el.inner_text()
                    if text and len(text.strip()) > 2:
                        product["name"] = text.strip()
                        break
        except Exception:
            continue

    # Price
    price_selectors = [
        '[class*="price"]',
        '[class*="Price"]',
        'span:has-text("¥")',
    ]
    for sel in price_selectors:
        try:
            els = await page.query_selector_all(sel)
            for el in els:
                text = await el.inner_text()
                match = re.search(r"[¥￥]?\s*(\d+\.?\d*)", text)
                if match:
                    price = float(match.group(1))
                    if 0.01 < price < 999999:
                        product["price"] = price
                        break
            if product["price"]:
                break
        except Exception:
            continue

    # Images
    try:
        img_selectors = [
            'img[class*="main"]',
            'img[class*="thumb"]',
            "img",
        ]
        for sel in img_selectors:
            imgs = await page.query_selector_all(sel)
            urls = []
            for img in imgs[:10]:  # Max 10 images
                src = await img.get_attribute("src") or await img.get_attribute("data-src")
                if src and src.startswith("http") and not src.endswith(".gif"):
                    # Prefer larger images
                    if "60x60" not in src and "icon" not in src.lower():
                        urls.append(src)
            if urls:
                product["images"] = urls[:5]
                break
    except Exception:
        pass

    # Description from meta
    try:
        desc = await page.get_attribute('meta[name="description"]', "content")
        if desc:
            product["description"] = desc.strip()[:500]
    except Exception:
        pass

    return product
