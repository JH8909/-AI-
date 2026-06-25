import { queryOne, queryRows } from "@/lib/postgres"
import { dataPath } from "@/lib/data-dir"
import { promises as fs } from "fs"
import { randomUUID } from "crypto"
import { normalizeRunLimit, toJsonObject } from "@/lib/automation-run-store-utils"

export type AutomationRunStatus = "running" | "succeeded" | "failed"

export interface AutomationRunOptionsRecord {
  trigger: string
  options: Record<string, unknown>
}

const CACHE_FILE = ".automation-runs-cache.json"

async function readCache(): Promise<any[]> {
  try {
    const rows = JSON.parse(await fs.readFile(await dataPath(CACHE_FILE), "utf-8"))
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

async function writeCache(rows: any[]) {
  try {
    await fs.writeFile(await dataPath(CACHE_FILE), JSON.stringify(rows, null, 2), "utf-8")
  } catch {}
}

async function startCachedRun(input: AutomationRunOptionsRecord) {
  const run = {
    id: randomUUID(),
    trigger: input.trigger || "manual",
    status: "running",
    options: input.options || {},
    result: {},
    error: null,
    started_at: new Date().toISOString(),
    completed_at: null,
  }
  const rows = await readCache()
  rows.unshift(run)
  await writeCache(rows.slice(0, 100))
  return run
}

async function finishCachedRun(id: string | undefined, status: AutomationRunStatus, result: unknown, error?: string) {
  if (!id) return null
  const rows = await readCache()
  const index = rows.findIndex((run) => run.id === id)
  if (index < 0) return null
  rows[index] = {
    ...rows[index],
    status,
    result: toJsonObject(result),
    error: error || null,
    completed_at: new Date().toISOString(),
  }
  await writeCache(rows)
  return rows[index]
}

export async function startAutomationRun(input: AutomationRunOptionsRecord) {
  try {
    return await queryOne(
      `INSERT INTO automation_runs (trigger, status, options, started_at)
       VALUES ($1, 'running', $2, NOW())
       RETURNING *`,
      [input.trigger, input.options || {}],
    )
  } catch {
    return startCachedRun(input)
  }
}

export async function finishAutomationRun(id: string | undefined, status: AutomationRunStatus, result: unknown, error?: string) {
  if (!id) return null
  try {
    return await queryOne(
      `UPDATE automation_runs
       SET status = $2, result = $3, error = $4, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, toJsonObject(result), error || null],
    )
  } catch {
    return finishCachedRun(id, status, result, error)
  }
}

export async function listAutomationRuns(limit = 20) {
  const normalizedLimit = normalizeRunLimit(limit)
  try {
    return await queryRows(
      `SELECT *
       FROM automation_runs
       ORDER BY started_at DESC
       LIMIT $1`,
      [normalizedLimit],
    )
  } catch {
    return (await readCache()).slice(0, normalizedLimit)
  }
}
