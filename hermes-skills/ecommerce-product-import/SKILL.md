---
name: ecommerce-product-import
description: 电商产品数据导入流程 — CSV批量导入或单链接解析，含数据清洗和安全过滤
category: ecommerce
tags: [ecommerce, scraper, csv, playwright, product-import]
---

# 电商产品导入 Skill

## 适用场景
- 用户提供 CSV 产品列表，需要批量导入
- 用户提供单个商品链接，需要解析产品信息
- 需要对导入产品做安全合规过滤

## 前置条件
- Python 3.11+ 已安装
- Playwright + Chromium 已安装
- 敏感词库已加载 (`services/scraper/scrapers/safety.py`)

## 执行步骤

### 1. CSV 批量导入
```bash
cd services/scraper
python main.py import --file <csv_path> --output <output.json> --json
```

### 2. 单链接解析
```bash
cd services/scraper
python main.py parse --url "<product_url>" --output <output.json> --json
```

### 3. 验证输出
检查输出 JSON 中：
- `total_clean` > 0
- `total_blocked` 中的产品确认为违禁品
- 每个产品的字段完整（name, category, price, images）

### 4. 导入 Supabase
将清洗后的产品数据写入 Supabase `products` 表：
- 通过 n8n `product-import` 工作流
- 或直接使用 Supabase JS Client

## 安全规则（不可跳过）
- 仿牌/山寨 → 自动拦截
- 医疗/药品 → 自动拦截
- 减肥/瘦身 → 自动拦截
- 保健品 → 自动拦截
- 三无产品 → 自动拦截

## 常见问题
| 问题 | 解决 |
|------|------|
| Playwright 未安装 | `playwright install chromium` |
| CSV 编码乱码 | 确保文件为 UTF-8-BOM |
| 链接解析失败 | 检查域名是否在 `SUPPORTED_DOMAINS` 中 |
