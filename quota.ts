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

type Snap = { unlimited?: boolean; percent_remaining?: number }

/** Returns percent USED (0-100) of the primary metered bucket, or null if unlimited. */
export async function fetchCopilotUsedPercent(): Promise<number | null> {
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
  let body: { quota_snapshots?: Record<string, Snap | undefined> }
  try {
    body = (await res.json()) as typeof body
  } catch {
    throw new QuotaUnavailableError("bad_response")
  }
  const s = body.quota_snapshots ?? {}
  const pick = [s.premium_interactions, s.chat, s.completions].find((x) => x && !x.unlimited)
  if (!pick) return null
  const remaining = Number(pick.percent_remaining ?? 0)
  return Math.max(0, Math.min(100, Math.round(100 - remaining)))
}
