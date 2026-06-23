"""
AI 电商选品中台 — 产品采集服务
支持: CSV批量导入 + 单链接解析
"""

import argparse
import sys
import json
from pathlib import Path

# Add current dir to path
sys.path.insert(0, str(Path(__file__).parent))

from scrapers.csv_importer import import_csv
from scrapers.link_parser import parse_link
from scrapers.cleaner import clean_products
from scrapers.safety import filter_safety


def cmd_import(args):
    """CSV 批量导入"""
    print(f"[导入] 读取文件: {args.file}")
    products = import_csv(args.file)
    print(f"[导入] 解析到 {len(products)} 条产品")

    # 清洗
    products = clean_products(products)
    print(f"[清洗] 清洗后 {len(products)} 条")

    # 安全检查
    safe, blocked = filter_safety(products)
    print(f"[安全] 通过 {len(safe)} 条, 拦截 {len(blocked)} 条")

    if blocked:
        print(f"[安全] 拦截原因:")
        for p in blocked:
            print(f"  - {p['name']}: {', '.join(p.get('_blocked_keywords', []))}")

    # Output
    output_path = args.output or args.file.replace(".csv", "_cleaned.json")
    output = {
        "source": "csv_import",
        "total_raw": len(products),
        "total_clean": len(safe),
        "total_blocked": len(blocked),
        "products": safe,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"[导出] 已写入: {output_path}")

    if args.json:
        print(json.dumps(output, ensure_ascii=False, indent=2))

    return output


def cmd_parse(args):
    """单链接解析"""
    import asyncio

    print(f"[解析] 链接: {args.url}")
    product = asyncio.run(parse_link(args.url))

    if not product:
        print("[解析] 解析失败")
        sys.exit(1)

    # 安全检查
    safe_list, blocked = filter_safety([product])

    if blocked:
        print(f"[拦截] 产品违反安全规则: {', '.join(blocked[0].get('_blocked_keywords', []))}")
        sys.exit(1)

    output_path = args.output or "parsed_product.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(safe_list[0], f, ensure_ascii=False, indent=2)
    print(f"[导出] 已写入: {output_path}")

    if args.json:
        print(json.dumps(safe_list[0], ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(
        description="AI 电商选品中台 - 产品采集工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py import --file products.csv
  python main.py import --file products.csv --output result.json --json
  python main.py parse --url "https://detail.1688.com/offer/xxx.html"
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # import 子命令
    import_parser = subparsers.add_parser("import", help="CSV 批量导入")
    import_parser.add_argument("--file", "-f", required=True, help="CSV 文件路径")
    import_parser.add_argument("--output", "-o", help="输出 JSON 路径")
    import_parser.add_argument("--json", action="store_true", help="以 JSON 格式输出到 stdout")

    # parse 子命令
    parse_parser = subparsers.add_parser("parse", help="单链接解析")
    parse_parser.add_argument("--url", "-u", required=True, help="商品链接")
    parse_parser.add_argument("--output", "-o", help="输出 JSON 路径")
    parse_parser.add_argument("--json", action="store_true", help="以 JSON 格式输出到 stdout")

    args = parser.parse_args()

    if args.command == "import":
        cmd_import(args)
    elif args.command == "parse":
        cmd_parse(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
