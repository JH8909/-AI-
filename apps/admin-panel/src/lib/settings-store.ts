// ============================================
// Shared in-memory settings store
// File-backed fallback for persistence across restarts
// ============================================

import { promises as fs } from "fs"
import path from "path"

interface Settings {
  deepseekApiKey: string
  defaultModel: string
  llmBaseURL: string
  supabaseUrl: string
  supabaseKey: string
  serviceRoleKey: string
}

const _settings: Settings = {
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  defaultModel: process.env.LLM_MODEL || "deepseek-chat",
  llmBaseURL: process.env.DEEPSEEK_BASE_URL || process.env.LLM_BASE_URL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
}

let _initialized = false

export async function initSettings() {
  if (_initialized) return
  _initialized = true
  try {
    const fpath = path.join(process.cwd(), "settings.local.json")
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
    const fpath = path.join(process.cwd(), "settings.local.json")
    await fs.writeFile(fpath, JSON.stringify(_settings, null, 2), "utf-8")
  } catch { /* file write failed but in-memory is fine */ }
  return getSettings()
}
