import type { TuiPlugin } from "@opencode-ai/plugin/tui"
import { PricesDialog } from "./prices-dialog.js"
import { createBarSlotPlugin } from "./bar.js"
import { createSidebarSlotPlugin } from "./sidebar.js"
import { refreshQuota } from "./store.js"

const INTERVAL_MS = 5 * 60_000

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

function setupUsageBar(api: Parameters<TuiPlugin>[0]) {
  api.slots.register(createBarSlotPlugin(() => api.theme.current))
}

function setupSidebar(api: Parameters<TuiPlugin>[0]) {
  api.slots.register(createSidebarSlotPlugin(() => api.theme.current))
}

// One refresh loop (start, session.idle, every 5 min) feeds bar and sidebar.
function setupRefresh(api: Parameters<TuiPlugin>[0]) {
  const off = api.event.on("session.idle", () => void refreshQuota())
  const timer = setInterval(() => void refreshQuota(true), INTERVAL_MS)
  api.lifecycle.onDispose(() => {
    off()
    clearInterval(timer)
  })
  void refreshQuota(true)
}

const tui: TuiPlugin = async (api) => {
  try {
    setupPrices(api)
  } catch {}
  try {
    setupUsageBar(api)
  } catch {}
  try {
    setupSidebar(api)
  } catch {}
  try {
    setupRefresh(api)
  } catch {}
}

export default { id: "copilot-tools", tui }
