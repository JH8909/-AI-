// ============================================
// AI 竞品分析服务
// ============================================

import { LLMAdapter, LLMResponse } from "@ecommerce/llm-adapter"
import type { ScoreOutput } from "./scorer"

export interface CompetitorProduct {
  name: string
  price: number
  platform: string
  url: string
}

export interface CompetitorAnalysisOutput {
  price_comparison: string
  differentiation: string
  content_strategy: string
  overall_report: string
  competitor_details: Array<{
    name: string
    strengths: string[]
    weaknesses: string[]
    threat_level: "low" | "medium" | "high"
  }>
}

const SYSTEM_PROMPT = `你是一个专业的电商竞品分析师。分析目标产品和竞品之间的差异，给出策略建议。

## 分析维度

1. **价格对比**：对比目标产品和竞品的价格定位，分析定价策略的优劣势。
2. **差异化分析**：指出目标产品与竞品的核心差异，包括材质、设计、功能、品牌等。
3. **内容策略**：为目标产品建议内容营销方向，包括平台选择、内容类型、传播点。
4. **综合报告**：给出综合竞品分析结论和行动建议。

## 输出格式
必须输出严格的JSON格式。所有分析用中文。`

export async function analyzeCompetitors(
  adapter: LLMAdapter,
  productInfo: {
    name: string
    description: string
    price: number | null
    category: string
    score?: ScoreOutput
  },
  competitors: CompetitorProduct[]
): Promise<LLMResponse<CompetitorAnalysisOutput>> {
  const userMessage = JSON.stringify({
    target_product: {
      name: productInfo.name,
      description: productInfo.description,
      price: productInfo.price ? `¥${productInfo.price}` : "未知",
      category: productInfo.category,
      ai_score: productInfo.score ? {
        overall: productInfo.score.overall_score,
        strengths: productInfo.score.overall_reasoning,
      } : null,
    },
    competitors: competitors.map(c => ({
      name: c.name,
      price: `¥${c.price}`,
      platform: c.platform,
    })),
  }, null, 2)

  return adapter.json<CompetitorAnalysisOutput>(SYSTEM_PROMPT, userMessage)
}
