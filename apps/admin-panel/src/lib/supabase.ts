import { env } from "./env"
import { createClient } from "@supabase/supabase-js"
import { getSettings, initSettings } from "./settings-store"

export const isSupabaseReady = env.hasSupabase

export const supabase = isSupabaseReady
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

export async function getSupabaseClient() {
  await initSettings()
  const settings = getSettings()
  const url = env.supabaseUrl || settings.supabaseUrl
  const serviceKey = env.supabaseServiceRoleKey || settings.serviceRoleKey

  if (!url || !serviceKey) return null

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
