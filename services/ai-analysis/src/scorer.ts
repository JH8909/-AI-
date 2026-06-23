// ============================================
// AI 产品评分服务
// ============================================

import { LLMAdapter, LLMResponse } from "@ecommerce/llm-adapter"

export interface ScoreInput {
  name: string
  description: string
  category: string
  price: number | null
  cost: number | null
  tags: string[]
}

export interface ScoreOutput {
  market_demand: number
  market_demand_reason: string
  profit_margin: number
  profit_margin_reason: string
  competition_intensity: number
  competition_intensity_reason: string
  compliance_risk: number
  compliance_risk_reason: string
  content_fit: number
  content_fit_reason: string
  overall_score: number
  overall_reasoning: string
}

const SYSTEM_PROMPT = `你是一个专业的电商选品分析师。你需要对给定的产品进行多维度打分（1-10分），并给出评分理由。

## 评分维度

1. **市场需求度**（1-10）：这个产品在目标市场的需求强度。考虑搜索量、话题热度、消费趋势。
2. **利润空间**（1-10）：产品的利润空间。考虑成本和市场定价。
3. **竞争激烈度**（1-10）：市场竞争程度。注意：分数越高表示竞争越激烈（越低越好）。
4. **合规风险**（1-10）：产品的合规风险。注意：分数越高表示风险越高（越低越好）。仿牌/医疗/减肥/保健品直接给9-10分。
5. **内容适配度**（1-10）：产品是否适合在社交平台（小红书/闲鱼）做内容营销。
6. **综合推荐指数**（保留1位小数）：加权综合评分。

## 输出格式
必须输出严格的JSON格式，包含每个维度的评分和理由。理由用中文。

## 安全红线
- 仿牌、山寨产品：合规风险自动9-10分，综合推荐指数不高于3分
- 医疗类产品：合规风险自动9-10分，综合推荐指数不高于2分
- 减肥类产品：合规风险自动9-10分，综合推荐指数不高于2分
- 保健品：合规风险自动8-10分，综合推荐指数不高于3分
- 三无产品：合规风险自动10分，综合推荐指数不高于1分`

export async function scoreProduct(
  adapter: LLMAdapter,
  input: ScoreInput
): Promise<LLMResponse<ScoreOutput>> {
  const userMessage = JSON.stringify({
    product: {
      name: input.name,
      description: input.description,
      category: input.category,
      price: input.price ? `¥${input.price}` : "未知",
      cost: input.cost ? `¥${input.cost}` : "未知",
      tags: input.tags,
    }
  }, null, 2)

  return adapter.json<ScoreOutput>(SYSTEM_PROMPT, userMessage)
}

// Sensitive keywords to pre-filter
const BLOCK_KEYWORDS = [
  "仿牌", "原单", "复刻", "高仿", "A货", "超A",
  "减肥", "瘦身", "燃脂",
  "医疗", "治疗", "治愈", "疗程",
  "保健", "滋补", "养生",
  "三无", "无标", "白牌",
]

export function preCheckSafety(product: ScoreInput): {
  passed: boolean
  blockedKeywords: string[]
} {
  const text = `${product.name} ${product.description} ${product.tags.join(" ")}`.toLowerCase()
  const blocked = BLOCK_KEYWORDS.filter(kw => text.includes(kw.toLowerCase()))
  return { passed: blocked.length === 0, blockedKeywords: blocked }
}
