// ============================================
// Shared in-memory settings store
// File-backed fallback for persistence across restarts
// ============================================

import { promises as fs } from "fs"
import { dataPath } from "@/lib/data-dir"

interface Settings {
  deepseekApiKey: string
  defaultModel: string
  llmBaseURL: string
  supabaseUrl: string
  supabaseKey: string
  serviceRoleKey: string
  databaseUrl: string
  trendSourceUrls: string
  wecomWebhookUrl: string
  feishuWebhookUrl: string
}

const _settings: Settings = {
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  defaultModel: process.env.LLM_MODEL || "deepseek-chat",
  llmBaseURL: process.env.DEEPSEEK_BASE_URL || process.env.LLM_BASE_URL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || "",
  trendSourceUrls: process.env.TREND_SOURCE_URLS || "",
  wecomWebhookUrl: process.env.WECOM_WEBHOOK_URL || "",
  feishuWebhookUrl: process.env.FEISHU_WEBHOOK_URL || "",
}

let _initialized = false

export async function initSettings() {
  if (_initialized) return
  _initialized = true
  try {
    const fpath = await dataPath("settings.local.json")
    const data = await fs.readFile(fpath, "utf-8")
    Object.assign(_settings, JSON.parse(data))
  } catch { /* use defaults */ }
}

export function getSettings(): Settings {
  return { ..._settings }
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  Object.assign(_settings, partial)
  // Try to persist to file (best effort)
  try {
    const fpath = await dataPath("settings.local.json")
    await fs.writeFile(fpath, JSON.stringify(_settings, null, 2), "utf-8")
  } catch { /* file write failed but in-memory is fine */ }
  return getSettings()
}
