// ============================================
// AI 内容生成服务
// 支持：小红书文案、闲鱼文案、图片 Prompt
// ============================================

import { LLMAdapter, LLMResponse } from "@ecommerce/llm-adapter"

export type Platform = "xiaohongshu" | "xianyu"
export type ContentType = "product_post" | "review" | "tutorial"

export interface ContentOutput {
  title: string
  body: string
  hashtags: string[]
  price_suggestion: number | null
  image_prompt: string
}

export interface GenerateInput {
  productName: string
  productDescription: string
  category: string
  price: number | null
  cost: number | null
  tags: string[]
  aiScore?: {
    overall_score: number
    content_fit: number
    reasoning: string
  }
}

// ============ Platform-Specific Prompts ============

const XIAOHONGSHU_PROMPT = `你是一个专业的小红书内容创作者，擅长写种草文案。

## 写作要求
- 风格：真实的使用体验分享，避免硬广感
- 语气：亲切自然，像朋友推荐
- 结构：吸引人的标题 + 场景化开头 + 产品亮点 + 使用感受 + 话题标签
- 标题：15-30字，包含数字或情绪词，有吸引力
- 正文：150-300字，分段清晰，适当用emoji
- 标签：3-6个相关话题标签（带#号）
- 图片提示：生成一个适合产品的小红书风格拍摄场景描述

## 输出格式
严格的JSON格式。所有内容用中文。`

const XIANYU_PROMPT = `你是一个专业的闲鱼卖家，擅长写高转化率的宝贝文案。

## 写作要求
- 风格：简洁直接，突出卖点和性价比
- 语气：诚实可信，像个人卖家
- 结构：标题（含关键词）+ 产品描述 + 规格参数 + 价格说明
- 标题：10-20字，包含核心关键词
- 正文：50-150字，简洁有力
- 不需标签
- 图片提示：生成适合闲鱼风格的实拍场景描述

## 输出格式
严格的JSON格式。所有内容用中文。`

// ============ Safety Check ============

const BLOCKED_CONTENT_PATTERNS = [
  "仿牌", "原单", "复刻", "高仿", "A货",
  "减肥", "瘦身", "燃脂", "减肥药",
  "治疗", "治愈", "疗程", "医疗",
  "保健品", "滋补",
  "三无", "无标",
]

export function checkContentSafety(content: ContentOutput): {
  safe: boolean
  violations: string[]
} {
  const text = `${content.title} ${content.body} ${content.hashtags.join(" ")}`
  const violations = BLOCKED_CONTENT_PATTERNS.filter(kw => text.includes(kw))
  return { safe: violations.length === 0, violations }
}

// ============ Generator ============

function buildUserMessage(input: GenerateInput): string {
  return JSON.stringify({
    product: {
      name: input.productName,
      description: input.productDescription,
      category: input.category,
      price: input.price ? `¥${input.price}` : "未知",
      cost: input.cost ? `¥${input.cost}` : "未知",
      tags: input.tags,
    },
    ai_analysis: input.aiScore ? {
      score: input.aiScore.overall_score,
      content_fit: input.aiScore.content_fit,
      insight: input.aiScore.reasoning,
    } : null,
  }, null, 2)
}

export async function generateContent(
  adapter: LLMAdapter,
  platform: Platform,
  input: GenerateInput
): Promise<LLMResponse<ContentOutput>> {
  const systemPrompt = platform === "xiaohongshu" ? XIAOHONGSHU_PROMPT : XIANYU_PROMPT
  const userMessage = buildUserMessage(input)

  const result = await adapter.json<ContentOutput>(systemPrompt, userMessage)

  // Safety check on generated content
  if (result.success && result.data) {
    const safety = checkContentSafety(result.data)
    if (!safety.safe) {
      return {
        success: false,
        data: null,
        error: `Generated content blocked by safety filter. Violations: ${safety.violations.join(", ")}`,
        model: result.model,
        tokensUsed: result.tokensUsed,
      }
    }
  }

  return result
}

// ============ Image Prompt Generator ============

const IMAGE_PROMPT_SYSTEM = `你是一个专业的AI图像生成提示词工程师。根据产品信息生成高质量的图片Prompt。

## 要求
- 风格参考：小红书爆款产品图风格，干净整洁，有生活场景感
- 描述细致：包含光线、构图、角度、背景、道具
- 适合Stable Diffusion / ComfyUI / 即梦等工具
- 不要包含品牌logo或水印描述
- 输出JSON格式，含中英文两个版本的prompt`

export interface ImagePromptOutput {
  prompt_cn: string
  prompt_en: string
  style: string
  composition: string
}

export async function generateImagePrompt(
  adapter: LLMAdapter,
  input: GenerateInput
): Promise<LLMResponse<ImagePromptOutput>> {
  const userMessage = buildUserMessage(input)
  return adapter.json<ImagePromptOutput>(IMAGE_PROMPT_SYSTEM, userMessage)
}
