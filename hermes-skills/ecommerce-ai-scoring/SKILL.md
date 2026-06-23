---
name: ecommerce-ai-scoring
description: 对电商产品进行AI多维度评分，输出结构化评分报告
category: ecommerce
tags: [ecommerce, ai, scoring, llm, product-analysis]
---

# 电商AI产品评分 Skill

## 适用场景
- 新导入产品需要评估市场潜力
- 多产品对比选品决策
- 定期产品池健康度检查

## 前置条件
- LLM Provider 已配置 (DeepSeek/GPT/Claude)
- 产品数据已存在于 Supabase `products` 表
- AI 分析 API 服务可用

## 评分维度

| 维度 | 范围 | 说明 |
|------|------|------|
| market_demand | 1-10 | 市场需求度，越高越好 |
| profit_margin | 1-10 | 利润空间，越高越好 |
| competition_intensity | 1-10 | 竞争激烈度，越低越好 |
| compliance_risk | 1-10 | 合规风险，越低越好 |
| content_fit | 1-10 | 内容适配度，越高越好 |
| overall_score | 0-10 | 综合推荐指数 |

## 执行步骤

### 1. 通过 n8n Webhook 触发
```bash
curl -X POST https://n8n.example.com/webhook/ai-scoring \
  -H "Content-Type: application/json" \
  -d '{"product_id": "<uuid>", "model": "deepseek-v3"}'
```

### 2. 通过 AI API 直接调用
```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"product_id": "<uuid>"}'
```

### 3. 在后台面板操作
1. 进入 "AI 评分" 页面
2. 选择目标产品
3. 点击 "开始评分"

## 安全红线（自动拦截）
以下品类自动低分：
- 仿牌/山寨 → compliance_risk=10, overall≤3
- 医疗产品 → compliance_risk=10, overall≤2
- 减肥产品 → compliance_risk=10, overall≤2
- 保健品 → compliance_risk=9-10, overall≤3

## 输出格式
所有评分结果输出为 JSON，包含每个维度的评分数值和 AI 推理理由。
