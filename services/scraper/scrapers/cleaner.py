"""
数据清洗器 — 标准化、去重、格式化
"""

import re
from typing import Any


def clean_products(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """清洗产品列表"""
    cleaned = []

    for p in products:
        try:
            p = clean_single(p)
            if p:  # 清洗后仍有效
                cleaned.append(p)
        except Exception as e:
            print(f"[清洗] 跳过无效条目: {e}")
            continue

    # 去重（按名称）
    seen = set()
    deduped = []
    for p in cleaned:
        key = p.get("name", "").strip().lower()
        if key and key not in seen:
            seen.add(key)
            deduped.append(p)

    return deduped


def clean_single(product: dict[str, Any]) -> dict[str, Any] | None:
    """清洗单个产品"""
    # 名称清理
    name = (product.get("name") or "").strip()
    if not name or len(name) < 2:
        return None
    # 去除多余空格和特殊字符
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"[【】\[\]]", "", name)
    product["name"] = name[:200]  # 截断过长名称

    # 描述清理
    desc = (product.get("description") or "").strip()
    desc = re.sub(r"\s+", " ", desc)
    product["description"] = desc[:1000]

    # 价格标准化
    price = product.get("price")
    if price is not None:
        try:
            price = float(price)
            if price <= 0 or price > 999999:
                product["price"] = None
            else:
                product["price"] = round(price, 2)
        except (ValueError, TypeError):
            product["price"] = None

    cost = product.get("cost")
    if cost is not None:
        try:
            cost = float(cost)
            if cost <= 0 or cost > 999999:
                product["cost"] = None
            else:
                product["cost"] = round(cost, 2)
        except (ValueError, TypeError):
            product["cost"] = None

    # 图片 URL 清理
    images = product.get("images", [])
    if isinstance(images, str):
        images = [images]
    product["images"] = [u.strip() for u in images if u.strip().startswith("http")][:10]

    # 标签清理
    tags = product.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.replace("，", ",").split(",") if t.strip()]
    product["tags"] = [t.strip()[:30] for t in tags if t.strip()][:20]

    # 分类标准化
    category = (product.get("category") or "other").strip().lower()
    valid_categories = {
        "fashion", "electronics", "home", "beauty",
        "food", "sports", "toys", "books", "digital", "other"
    }
    # 中文分类映射
    cat_map = {
        "服饰": "fashion", "服装": "fashion", "衣服": "fashion",
        "电子": "electronics", "数码": "digital", "手机": "electronics",
        "家居": "home", "家具": "home", "日用": "home",
        "美妆": "beauty", "护肤": "beauty", "化妆品": "beauty",
        "食品": "food", "零食": "food",
        "运动": "sports", "户外": "sports", "健身": "sports",
        "玩具": "toys",
        "图书": "books", "书籍": "books",
    }
    category = cat_map.get(category, category)
    if category not in valid_categories:
        category = "other"
    product["category"] = category

    return product
