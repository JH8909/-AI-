# LLM Provider Adapter

统一 LLM 调用接口，支持多 Provider 切换。

## 支持的 Provider

| Provider | API 兼容 | 说明 |
|----------|----------|------|
| DeepSeek | OpenAI-compatible | 直接可用 |
| OpenAI | OpenAI-compatible | 直接可用 |
| Anthropic | 原生不兼容 | 需通过 OpenRouter 等代理 |

## 使用

```typescript
import { createLLMAdapter } from "@ecommerce/llm-adapter"

const adapter = createLLMAdapter("deepseek", process.env.DEEPSEEK_API_KEY!)
const result = await adapter.json(systemPrompt, userMessage)

if (result.success) {
  console.log(result.data)  // parsed JSON
} else {
  console.error(result.error)
}
```

## 输出规范
- 所有响应为 LLMResponse<T> 格式
- JSON 自动解析（含 markdown code block 降级）
- 错误不抛异常，通过 success: false 返回
