/** @jsxImportSource @opentui/solid */
import { createSignal } from "solid-js"
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui"

export type BarState = { status: "loading" } | { status: "ready"; percent: number | null } | { status: "error" }

const [state, setState] = createSignal<BarState>({ status: "loading" })
export const setBarState = setState

export function label(s: BarState): string {
  if (s.status === "loading") return ""
  if (s.status === "error") return "Copilot --"
  return s.percent === null ? "Copilot unlimited" : `Copilot ${s.percent}%`
}

function color(t: TuiThemeCurrent, s: BarState) {
  if (s.status === "ready" && s.percent !== null) {
    if (s.percent >= 90) return t.error
    if (s.percent >= 70) return t.warning
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
            <text fg={color(theme(), state())}>{label(state())}</text>
          </box>
        )
      },
    },
  }
}
