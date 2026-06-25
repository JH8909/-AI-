// ============================================
// 环境变量配置 — 所有服务从这里读取配置
// Missing values = 降级到 Mock 数据模式
// ============================================

export const env = {
  // Supabase (optional - mock fallback when missing)
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || "",
  
  // LLM Provider (optional - mock fallback when missing)  
  llmProvider: (process.env.NEXT_PUBLIC_LLM_PROVIDER || "deepseek") as "deepseek" | "openai" | "anthropic",
  llmApiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "",
  llmModel: process.env.NEXT_PUBLIC_LLM_MODEL || "deepseek-chat",
  llmBaseURL: process.env.LLM_BASE_URL || "",
  
  get hasSupabase() { return !!(this.supabaseUrl && this.supabaseServiceRoleKey) },
  get hasDatabase() { return !!this.databaseUrl || this.hasSupabase },
  get hasLLM() { return !!this.llmApiKey },
  get isMockMode() { return !this.hasDatabase },
}
