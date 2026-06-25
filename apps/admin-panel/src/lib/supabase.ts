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
  const serviceKey = env.supabaseServiceRoleKey || settings.serviceRoleKey || settings.supabaseKey

  if (!url || !serviceKey) return null

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function withSupabaseTimeout<T>(query: PromiseLike<T>, timeoutMs = 3000): Promise<T> {
  return Promise.race([
    Promise.resolve(query),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Supabase request timeout")), timeoutMs)
    }),
  ])
}
