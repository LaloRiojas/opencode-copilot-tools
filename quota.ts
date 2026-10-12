/**
 * Copilot quota client. Adapted from opencode-copilot-quota by Fitri Rahim (MIT).
 * Never logs or returns the token.
 */
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export class QuotaUnavailableError extends Error {
  constructor(readonly reason: "no_token" | "unauthorized" | "network" | "bad_response") {
    super(reason)
    this.name = "QuotaUnavailableError"
  }
}

function dataDir(): string {
  const xdg = process.env["XDG_DATA_HOME"]
  if (xdg && xdg.trim() !== "") return join(xdg, "opencode")
  return join(homedir(), ".local", "share", "opencode")
}

async function readToken(): Promise<string | null> {
  try {
    const raw = await readFile(join(dataDir(), "auth.json"), "utf8")
    const parsed = JSON.parse(raw) as Record<string, { access?: unknown } | undefined>
    const access = parsed["github-copilot"]?.access
    return typeof access === "string" && access.length > 0 ? access : null
  } catch {
    return null
  }
}

export interface QuotaSnapshot {
  unlimited: boolean
  percent_remaining: number
  remaining: number
  entitlement: number
}

export interface CopilotQuota {
  plan: string
  resetDate?: string // YYYY-MM-DD
  snapshots: {
    chat?: QuotaSnapshot
    completions?: QuotaSnapshot
    premium_interactions?: QuotaSnapshot
  }
}

type RawSnap = { unlimited?: unknown; percent_remaining?: unknown; remaining?: unknown; entitlement?: unknown }

function pick(s: RawSnap | undefined): QuotaSnapshot | undefined {
  if (!s) return undefined
  return {
    unlimited: Boolean(s.unlimited),
    percent_remaining: Number(s.percent_remaining ?? 0),
    remaining: Number(s.remaining ?? 0),
    entitlement: Number(s.entitlement ?? 0),
  }
}

/** One request to the Copilot endpoint; shared by the bar and the sidebar. */
export async function fetchCopilotQuota(): Promise<CopilotQuota> {
  const token = await readToken()
  if (!token) throw new QuotaUnavailableError("no_token")
  let res: Response
  try {
    res = await fetch("https://api.github.com/copilot_internal/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/json",
        "Editor-Version": "opencode/plugin",
        "User-Agent": "opencode-copilot-tools",
      },
    })
  } catch {
    throw new QuotaUnavailableError("network")
  }
  if (res.status === 401 || res.status === 403) throw new QuotaUnavailableError("unauthorized")
  if (!res.ok) throw new QuotaUnavailableError("bad_response")
  let body: {
    copilot_plan?: unknown
    quota_reset_date?: unknown
    quota_snapshots?: Record<string, RawSnap | undefined>
  }
  try {
    body = (await res.json()) as typeof body
  } catch {
    throw new QuotaUnavailableError("bad_response")
  }
  const s = body.quota_snapshots ?? {}
  return {
    plan: String(body.copilot_plan ?? "unknown"),
    resetDate: body.quota_reset_date ? String(body.quota_reset_date) : undefined,
    snapshots: {
      chat: pick(s.chat),
      completions: pick(s.completions),
      premium_interactions: pick(s.premium_interactions),
    },
  }
}

/** Percent USED (0-100) of the primary metered bucket, or null if all unlimited. */
export function usedPercent(q: CopilotQuota): number | null {
  const { premium_interactions, chat, completions } = q.snapshots
  const p = [premium_interactions, chat, completions].find((x) => x && !x.unlimited)
  if (!p) return null
  return Math.max(0, Math.min(100, Math.round(100 - p.percent_remaining)))
}
