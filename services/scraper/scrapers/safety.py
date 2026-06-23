"""
安全检查器 — 敏感词过滤，内容红线检测
"""

from typing import Any


# 敏感词库（分类）
BLOCKED_KEYWORDS = {
    "counterfeit": [
        "仿牌", "原单", "复刻", "高仿", "A货", "超A", "精仿",
        "Nike", "Adidas", "LV", "Gucci", "Chanel", "Hermes",
        "莆田", "厂货", "尾单", "原厂",
    ],
    "medical": [
        "医疗", "治疗", "治愈", "疗程", "处方", "药品",
        "手术", "诊断", "临床", "医院",
    ],
    "weight_loss": [
        "减肥", "瘦身", "燃脂", "减脂", "排油", "清脂",
        "纤体", "塑身",
    ],
    "supplement": [
        "保健品", "滋补", "养生品", "营养品", "蛋白粉",
        "酵素", "代餐",
    ],
    "unlicensed": [
        "三无", "无标", "白牌", "无生产日期", "无合格证",
        "无厂家", "地下工厂",
    ],
}


def filter_safety(products: list[dict[str, Any]]) -> tuple[list[dict], list[dict]]:
    """
    安全检查，返回 (通过列表, 拦截列表)

    Returns:
        (safe_products, blocked_products)
    """
    safe = []
    blocked = []

    for product in products:
        violations = _check_product(product)
        if violations:
            product["_blocked_keywords"] = violations
            product["_blocked_categories"] = list(set(
                cat for kw, cat in _get_violations_with_category(product)
            ))
            blocked.append(product)
        else:
            safe.append(product)

    return safe, blocked


def _check_product(product: dict[str, Any]) -> list[str]:
    """检查单个产品，返回违禁词列表"""
    text = _get_searchable_text(product)
    violations = []

    for category, keywords in BLOCKED_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text:
                violations.append(kw)

    return violations


def _get_violations_with_category(product: dict[str, Any]) -> list[tuple[str, str]]:
    """返回 (违禁词, 类别) 列表"""
    text = _get_searchable_text(product)
    results = []

    for category, keywords in BLOCKED_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text:
                results.append((kw, category))

    return results


def _get_searchable_text(product: dict[str, Any]) -> str:
    """提取产品中需要检查的文本"""
    parts = [
        str(product.get("name", "")),
        str(product.get("description", "")),
        str(product.get("category", "")),
        " ".join(str(t) for t in product.get("tags", [])),
        str(product.get("specs", {})),
    ]
    return " ".join(parts).lower()
