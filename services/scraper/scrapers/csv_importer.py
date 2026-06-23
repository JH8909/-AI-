"""
CSV 产品导入器
支持标准 CSV 格式，自动识别列名
"""

import csv
from pathlib import Path
from typing import Any


# 列名映射（CSV列名 → 标准字段名）
COLUMN_MAP = {
    # 中文列名
    "产品名称": "name",
    "商品名称": "name",
    "名称": "name",
    "标题": "name",
    "描述": "description",
    "产品描述": "description",
    "详情": "description",
    "分类": "category",
    "品类": "category",
    "类目": "category",
    "价格": "price",
    "售价": "price",
    "标价": "price",
    "成本": "cost",
    "成本价": "cost",
    "进价": "cost",
    "图片": "images",
    "图片链接": "images",
    "主图": "images",
    "规格": "specs",
    "属性": "specs",
    "标签": "tags",
    "关键词": "tags",
    "来源": "source_url",
    "链接": "source_url",
    "URL": "source_url",
    # 英文列名
    "name": "name",
    "product_name": "name",
    "description": "description",
    "category": "category",
    "price": "price",
    "cost": "cost",
    "images": "images",
    "specs": "specs",
    "tags": "tags",
    "source_url": "source_url",
}


def import_csv(file_path: str) -> list[dict[str, Any]]:
    """
    导入 CSV 文件，返回标准化产品列表

    Args:
        file_path: CSV 文件路径

    Returns:
        产品字典列表
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"文件不存在: {file_path}")

    products = []

    with open(path, "r", encoding="utf-8-sig") as f:
        # 检测分隔符
        sample = f.read(1024)
        f.seek(0)
        delimiter = "\t" if sample.count("\t") > sample.count(",") else ","

        reader = csv.DictReader(f, delimiter=delimiter)

        for row in reader:
            # 去除空行
            if not any(v.strip() for v in row.values() if v):
                continue

            product = _normalize_row(row)
            if product.get("name"):  # 至少要有产品名称
                products.append(product)

    return products


def _normalize_row(row: dict[str, str]) -> dict[str, Any]:
    """将 CSV 行标准化为产品字典"""
    product: dict[str, Any] = {
        "name": "",
        "description": "",
        "category": "other",
        "price": None,
        "cost": None,
        "images": [],
        "specs": {},
        "tags": [],
        "source_url": None,
        "source": "csv_import",
    }

    for csv_key, value in row.items():
        if csv_key is None:
            continue
        csv_key = csv_key.strip()
        value = (value or "").strip()
        if not value:
            continue

        # 映射列名
        field = COLUMN_MAP.get(csv_key, COLUMN_MAP.get(csv_key.lower()))
        if not field:
            continue

        # 类型转换
        if field == "price" or field == "cost":
            try:
                # 去除 ¥ 和逗号
                clean = value.replace("¥", "").replace(",", "").replace("元", "").strip()
                product[field] = float(clean)
            except (ValueError, TypeError):
                pass
        elif field == "images":
            product[field] = [u.strip() for u in value.replace("；", ";").split(";") if u.strip()]
        elif field == "tags":
            product[field] = [t.strip() for t in value.replace("，", ",").replace("；", ";").replace(";", ",").split(",") if t.strip()]
        elif field == "specs":
            # Try to parse as JSON, or treat as plain text
            try:
                import json
                product[field] = json.loads(value)
            except (json.JSONDecodeError, ValueError):
                product[field] = {"raw": value}
        elif field == "source_url":
            product[field] = value if value.startswith("http") else None
        else:
            product[field] = value

    return product
