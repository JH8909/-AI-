import { apiResponse, apiError } from "@/lib/data/mock-data"
import { promises as fs } from "fs"
import path from "path"

export async function POST() {
  const settingsPath = path.join(process.cwd(), "settings.local.json")
  let settings: any = {}
  try {
    settings = JSON.parse(await fs.readFile(settingsPath, "utf-8"))
  } catch {
    return apiError("Settings file not found")
  }

  const supabaseUrl = settings.supabaseUrl || ""
  const serviceKey = settings.serviceRoleKey || ""
  if (!supabaseUrl || !serviceKey) return apiError("请先在设置页面配置 Supabase")

  const project = supabaseUrl.replace("https://", "").split(".")[0]
  const poolerHost = `aws-0-ap-southeast-1.pooler.supabase.com`

  const migPath = path.join(process.cwd(), "..", "..", "packages", "supabase-schema", "migrations", "20260624_hot_product_radar.sql")
  let sql = ""
  try {
    sql = await fs.readFile(migPath, "utf-8")
  } catch {
    return apiError("Migration SQL file not found")
  }

  for (const connStr of [
    `postgresql://postgres.${project}:${serviceKey}@${poolerHost}:6543/postgres`,
    `postgresql://postgres:${serviceKey}@db.${project}.supabase.co:5432/postgres`,
    `postgresql://postgres.${project}:${serviceKey}@${project}.supabase.co:6543/postgres`,
  ]) {
    try {
      const { default: pg } = await import("pg")
      const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } })
      await client.connect()
      await client.query(sql)
      await client.end()
      return apiResponse({ success: true, message: "数据库初始化完成！迁移SQL已执行。" })
    } catch {}
  }

  return apiError("无法连接到数据库。请在 Supabase Dashboard SQL Editor 手动执行迁移SQL。")
}
