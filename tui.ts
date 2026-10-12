import type { TuiPlugin } from "@opencode-ai/plugin/tui"
import { PricesDialog } from "./prices-dialog.js"
import { fetchCopilotUsedPercent } from "./quota.js"
import { createBarSlotPlugin, setBarState } from "./bar.js"

const INTERVAL_MS = 5 * 60_000
const MIN_GAP_MS = 15_000
let last = 0
let inFlight: Promise<void> | null = null

function refresh(force = false): Promise<void> {
  if (inFlight) return inFlight
  if (!force && Date.now() - last < MIN_GAP_MS) return Promise.resolve()
  inFlight = (async () => {
    try {
      setBarState({ status: "ready", percent: await fetchCopilotUsedPercent() })
    } catch {
      setBarState({ status: "error" })
    } finally {
      last = Date.now()
      inFlight = null
    }
  })()
  return inFlight
}

function setupPrices(api: Parameters<TuiPlugin>[0]) {
  // Uses the (deprecated but still supported) api.command.register because it
  // is the only API in this version exposing `slash`.
  const off = api.command?.register(() => [
    {
      title: "Models with prices",
      value: "model-prices.show",
      category: "Model",
      slash: { name: "prices" },
      onSelect: (dialog) => {
        const d = dialog ?? api.ui.dialog
        d.replace(() => PricesDialog({ api }))
      },
    },
  ])
  if (off) api.lifecycle.onDispose(off)
}

async function setupUsageBar(api: Parameters<TuiPlugin>[0]) {
  api.slots.register(createBarSlotPlugin(() => api.theme.current))
  const off = api.event.on("session.idle", () => void refresh())
  const timer = setInterval(() => void refresh(true), INTERVAL_MS)
  api.lifecycle.onDispose(() => {
    off()
    clearInterval(timer)
  })
  await refresh(true)
}

const tui: TuiPlugin = async (api) => {
  try {
    setupPrices(api)
  } catch {}
  try {
    await setupUsageBar(api)
  } catch {}
}

export default { id: "copilot-tools", tui }
