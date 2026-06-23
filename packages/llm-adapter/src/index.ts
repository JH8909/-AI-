// ============================================
// LLM Provider Adapter — 统一 LLM 调用接口
// 支持: DeepSeek / OpenAI (GPT) / Anthropic (Claude)
// ============================================

import OpenAI from "openai"

// ---------- Types ----------
export type LLMProvider = "deepseek" | "openai" | "anthropic"

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface LLMResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
  model: string
  tokensUsed: number
}

export interface LLMRequestOptions {
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

// ---------- Provider Configs ----------
// NOTE: DeepSeek and OpenAI support the OpenAI-compatible API format.
// Anthropic uses a different API; for Claude, use a provider that offers
// an OpenAI-compatible endpoint (e.g., OpenRouter, or a proxy).
const PROVIDER_DEFAULTS: Record<LLMProvider, { baseURL: string; defaultModel: string }> = {
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  anthropic: {
    baseURL: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
}

// ---------- Adapter Class ----------
export class LLMAdapter {
  private client: OpenAI
  private config: LLMConfig

  constructor(config: LLMConfig) {
    this.config = config
    const defaults = PROVIDER_DEFAULTS[config.provider]
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || defaults.baseURL,
      dangerouslyAllowBrowser: false,
    })
  }

  /**
   * 发送聊天请求并返回结构化 JSON
   */
  async chat<T = Record<string, unknown>>(
    systemPrompt: string,
    userMessage: string,
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse<T>> {
    const model = this.config.model

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? this.config.maxTokens ?? 4096,
        // Note: response_format json_object is OpenAI/DeepSeek specific
        // Anthropic ignores this but it won't cause errors with the OpenAI client
        response_format: options.jsonMode ? { type: "json_object" } : undefined,
      })

      const content = response.choices[0]?.message?.content || ""
      const tokensUsed = response.usage?.total_tokens || 0

      // Parse JSON from response
      let data: T
      try {
        data = JSON.parse(content) as T
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[1]) as T
        } else {
          return {
            success: false,
            data: null,
            error: `Failed to parse JSON from LLM response: ${content.slice(0, 200)}`,
            model,
            tokensUsed,
          }
        }
      }

      return { success: true, data, error: null, model, tokensUsed }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, data: null, error: message, model, tokensUsed: 0 }
    }
  }

  /**
   * 便捷方法：单轮 JSON 输出
   */
  async json<T = Record<string, unknown>>(
    systemPrompt: string,
    userMessage: string,
    options?: LLMRequestOptions
  ): Promise<LLMResponse<T>> {
    return this.chat<T>(systemPrompt, userMessage, { ...options, jsonMode: true })
  }

  get provider(): LLMProvider {
    return this.config.provider
  }

  get modelName(): string {
    return this.config.model
  }
}

// ---------- Factory ----------
export function createLLMAdapter(
  provider: LLMProvider,
  apiKey: string,
  model?: string,
  baseURL?: string
): LLMAdapter {
  const defaults = PROVIDER_DEFAULTS[provider]
  return new LLMAdapter({
    provider,
    apiKey,
    baseURL: baseURL || defaults.baseURL,
    model: model || defaults.defaultModel,
  })
}

// ---------- Singleton (from env) ----------
let _adapter: LLMAdapter | null = null

export function getDefaultAdapter(): LLMAdapter {
  if (_adapter) return _adapter

  const provider = (process.env.LLM_PROVIDER || "deepseek") as LLMProvider
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || ""
  const model = process.env.LLM_MODEL

  if (!apiKey) {
    throw new Error("No LLM API key found. Set DEEPSEEK_API_KEY or OPENAI_API_KEY in environment.")
  }

  _adapter = createLLMAdapter(provider, apiKey, model)
  return _adapter
}

export function resetAdapter(): void {
  _adapter = null
}
