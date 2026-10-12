/** @jsxImportSource @opentui/solid */
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { usedPercent } from "./quota.js"
import { quotaState, type QuotaState } from "./store.js"

export function label(s: QuotaState): string {
  if (s.status === "loading") return ""
  if (s.status === "error") return "Copilot --"
  const p = usedPercent(s.quota)
  return p === null ? "Copilot unlimited" : `Copilot ${p}%`
}

function color(t: TuiThemeCurrent, s: QuotaState) {
  if (s.status === "ready") {
    const p = usedPercent(s.quota)
    if (p !== null && p >= 90) return t.error
    if (p !== null && p >= 70) return t.warning
  }
  return t.textMuted
}

export function createBarSlotPlugin(theme: () => TuiThemeCurrent) {
  return {
    order: 900,
    slots: {
      // app_bottom is rendered below every route (home and session).
      app_bottom() {
        return (
          <box flexShrink={0} flexDirection="row" justifyContent="flex-end" paddingLeft={2} paddingRight={2}>
            <text fg={color(theme(), quotaState())}>{label(quotaState())}</text>
          </box>
        )
      },
    },
  }
}
