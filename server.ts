/**
 * Server plugin: appends "($in/$out)" per 1M tokens to GitHub Copilot model
 * names so prices show in the built-in /models dialog. Fails silently; never
 * logs or returns the token. No solid-js imports here.
 */
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { formatPrice } from "./format"

const TIMEOUT_MS = 4000

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

type Prices = { batch_size?: number; default?: { input_price?: number; output_price?: number } }
type Remote = { id?: string; name?: string; billing?: { token_prices?: Prices } }

function suffix(p?: Prices): string | undefined {
  const d = p?.default
  if (!p || !d || typeof p.batch_size !== "number" || p.batch_size <= 0) return undefined
  const k = 10000 / p.batch_size
  const input = (d.input_price ?? 0) * k
  const output = (d.output_price ?? 0) * k
  if (input === 0 && output === 0) return "(Free)"
  return `(${formatPrice(input)}/${formatPrice(output)})`
}

async function copilotNames(baseURL: string): Promise<Record<string, string>> {
  const token = await readToken()
  if (!token) return {}
  const res = await fetch(`${baseURL}/models`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "opencode-copilot-tools",
      "Openai-Intent": "conversation-edits",
      "X-GitHub-Api-Version": "2026-08-01",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) return {}
  const body = (await res.json()) as { data?: Remote[] }
  const out: Record<string, string> = {}
  for (const m of body.data ?? []) {
    if (!m.id || !m.name) continue
    const s = suffix(m.billing?.token_prices)
    if (!s || m.name.endsWith(s)) continue
    out[m.id] = `${m.name} ${s}`
  }
  return out
}

type Cfg = { provider?: Record<string, { models?: Record<string, { name?: string }>; options?: { baseURL?: string } }> }

const server = async () => ({
  config: async (cfg: Cfg) => {
    try {
      const provider = (cfg.provider ??= {})
      const entry = (provider["github-copilot"] ??= {})
      const base = entry.options?.baseURL ?? "https://api.githubcopilot.com"
      const names = await copilotNames(base)
      const models = (entry.models ??= {})
      for (const [id, name] of Object.entries(names)) {
        const cur = models[id]
        if (cur?.name) continue // user override wins
        models[id] = { ...cur, name }
      }
    } catch {}
  },
})

export default { id: "copilot-tools", server }
