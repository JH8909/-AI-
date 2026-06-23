# AI 分析服务

## 功能
1. AI 产品评分（多维度）
2. 竞品分析报告生成
3. 内容生成（小红书文案/闲鱼文案/图片Prompt）

## 技术栈
- Node.js / TypeScript
- @ecommerce/llm-adapter (统一 LLM Provider)

## API 端点

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/score | AI 产品评分 |
| POST | /api/competitor-analysis | 竞品分析 |
| POST | /api/generate-content | 内容生成 |

## 输出规范
- 所有响应为 JSON
- 包含 model_used 和 tokens_used
