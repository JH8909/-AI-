import { initSettings, getSettings } from "@/lib/settings-store"

type QueryParam = string | number | boolean | null | Date | string[] | Record<string, unknown> | unknown[]

let pool: any = null
let poolUrl = ""

export async function getDatabaseUrl() {
  await initSettings()
  const settings = getSettings()
  return settings.databaseUrl || process.env.DATABASE_URL || process.env.POSTGRES_URL || ""
}

export async function getPgPool() {
  const databaseUrl = await getDatabaseUrl()
  if (!databaseUrl) return null
  if (pool && poolUrl === databaseUrl) return pool

  if (pool) {
    try { await pool.end() } catch {}
  }

  // Runtime require keeps the app buildable in mock mode before dependencies are installed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require("pg")
  pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 3000),
    idleTimeoutMillis: 30000,
    max: Number(process.env.DB_POOL_MAX || 5),
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  })
  poolUrl = databaseUrl
  return pool
}

export async function queryRows<T = any>(sql: string, params: QueryParam[] = [], timeoutMs = 4000): Promise<T[]> {
  const db = await getPgPool()
  if (!db) throw new Error("DATABASE_URL is not configured")

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Database request timeout")), timeoutMs)
  })
  const result = await Promise.race([db.query(sql, params), timeout])
  return (result as any).rows || []
}

export async function queryOne<T = any>(sql: string, params: QueryParam[] = [], timeoutMs = 4000): Promise<T | null> {
  const rows = await queryRows<T>(sql, params, timeoutMs)
  return rows[0] || null
}

export function hasMissingTableError(err: any) {
  return err?.code === "42P01" || /relation .* does not exist/i.test(String(err?.message || ""))
}

export function normalizeDbProduct(row: any) {
  if (!row) return row
  return {
    ...row,
    price: row.price == null ? null : Number(row.price),
    cost: row.cost == null ? null : Number(row.cost),
    images: Array.isArray(row.images) ? row.images : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
  }
}
