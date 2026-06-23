# 产品采集服务 (Scraper)

## 技术栈
- Python 3.11+
- Playwright
- BeautifulSoup4
- pandas (CSV 处理)

## 功能
1. CSV 批量导入产品
2. 单链接解析（1688/淘宝/拼多多）
3. 数据清洗与标准化
4. 敏感词过滤

## 使用

```bash
cd services/scraper
pip install -r requirements.txt
playwright install chromium

# CSV 导入
python main.py import --file products.csv

# 单链接解析
python main.py parse --url "https://detail.1688.com/xxx"
```

## 安全规范
- 不抓取需登录的页面
- 遵守 robots.txt
- 请求间隔 >= 2秒
- 不解析仿牌/医疗/减肥/保健品/三无产品
