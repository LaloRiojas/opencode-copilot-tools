import { createSignal } from "solid-js"
import { fetchCopilotQuota, QuotaUnavailableError, type CopilotQuota } from "./quota.js"

export type QuotaState =
  | { status: "loading" }
  | { status: "ready"; quota: CopilotQuota }
  | { status: "error"; message: string }

const [quotaState, setQuotaState] = createSignal<QuotaState>({ status: "loading" })
export { quotaState }

const MIN_GAP_MS = 15_000
let last = 0
let inFlight: Promise<void> | null = null

function messageFor(err: unknown): string {
  if (err instanceof QuotaUnavailableError) {
    if (err.reason === "no_token") return "sign in to Copilot"
    if (err.reason === "unauthorized") return "auth failed"
  }
  return "unavailable"
}

/** Single refresh path: one request updates both the bar and the sidebar. */
export function refreshQuota(force = false): Promise<void> {
  if (inFlight) return inFlight
  if (!force && Date.now() - last < MIN_GAP_MS) return Promise.resolve()
  inFlight = (async () => {
    try {
      setQuotaState({ status: "ready", quota: await fetchCopilotQuota() })
    } catch (err) {
      setQuotaState({ status: "error", message: messageFor(err) })
    } finally {
      last = Date.now()
      inFlight = null
    }
  })()
  return inFlight
}
