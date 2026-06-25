import { queryOne, queryRows } from "@/lib/postgres"

export type AutomationRunStatus = "running" | "succeeded" | "failed"

export interface AutomationRunOptionsRecord {
  trigger: string
  options: Record<string, unknown>
}

function toJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return value == null ? {} : { value }
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
    return null
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
    return null
  }
}

export async function listAutomationRuns(limit = 20) {
  try {
    return await queryRows(
      `SELECT *
       FROM automation_runs
       ORDER BY started_at DESC
       LIMIT $1`,
      [Math.min(Math.max(Number(limit) || 20, 1), 100)],
    )
  } catch {
    return []
  }
}
