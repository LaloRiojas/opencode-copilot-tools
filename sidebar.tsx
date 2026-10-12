/** @jsxImportSource @opentui/solid */
/**
 * QuotaWidget — renders into the OpenCode sidebar_content slot.
 *
 * Native look: uses the host theme colors (api.theme.current) and OpenTUI
 * primitives (<box>, <text>) so it sits inline with Context and LSP.
 */

import { Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import type { CopilotQuota, QuotaSnapshot } from "./quota.js"
import { quotaState as state } from "./store.js"
import {
  formatNumber,
  formatPlan,
  percentUsed,
  progressBarParts,
  resetLabel,
} from "./quota-format.js"

/**
 * The SolidPlugin object registered via api.slots.register(). The `theme`
 * accessor returns the live host theme so colors follow theme changes.
 *
 * Note: the registered plugin must NOT carry an `id` field — the TUI slot
 * registry assigns identity itself (TuiSlotPlugin has `id?: never`).
 */
export function createSidebarSlotPlugin(theme: () => TuiThemeCurrent) {
  return {
    // Native sidebar sections use order (context=100, files=500). Place the
    // quota just above Context.
    order: 90,
    slots: {
      // Host passes { session_id }; we render our section for every session.
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return <SidebarQuotaSection theme={theme} />
      },
    },
  }
}

function SidebarQuotaSection(props: { theme: () => TuiThemeCurrent }) {
  const t = props.theme

  return (
    <box style={{ flexDirection: "column", marginTop: 1 }}>
      {/* Bold header, matching native section titles */}
      <text style={{ fg: t().text, attributes: TextAttributes.BOLD }}>
        Copilot Quota
      </text>

      <Show
        when={state().status === "ready"}
        fallback={<QuotaFallback theme={t} />}
      >
        <QuotaReady
          theme={t}
          quota={(state() as { status: "ready"; quota: CopilotQuota }).quota}
        />
      </Show>
    </box>
  )
}

function QuotaFallback(props: { theme: () => TuiThemeCurrent }) {
  const t = props.theme
  return (
    <Show
      when={state().status === "error"}
      fallback={<text style={{ fg: t().textMuted }}>loading…</text>}
    >
      <text style={{ fg: t().warning }}>
        {(state() as { status: "error"; message: string }).message}
      </text>
    </Show>
  )
}

function QuotaReady(props: {
  theme: () => TuiThemeCurrent
  quota: CopilotQuota
}) {
  const t = props.theme

  const reset = () => resetLabel(props.quota.resetDate)

  return (
    <box style={{ flexDirection: "column" }}>
      <text style={{ fg: t().textMuted }}>
        {`Plan - ${formatPlan(props.quota.plan)}`}
      </text>

      <Show when={props.quota.snapshots.premium_interactions}>
        {(() => {
          const s = props.quota.snapshots.premium_interactions!
          const used = percentUsed({
            percent_remaining: s.percent_remaining,
          } as QuotaSnapshot)
          const parts = progressBarParts(used)
          return (
            <text>
              <span style={{ fg: t().error }}>{parts.filled}</span>
              <span style={{ fg: t().success }}>{parts.empty}</span>
              <span style={{ fg: t().textMuted }}>{` ${used}%`}</span>
            </text>
          )
        })()}
      </Show>

      <Show when={props.quota.snapshots.premium_interactions}>
        {(() => {
          const s = props.quota.snapshots.premium_interactions!
          const usedCount = Math.max(0, s.entitlement - s.remaining)
          return (
            <text style={{ fg: t().textMuted }}>
              {`Premium ${formatNumber(usedCount)}/${formatNumber(
                s.entitlement,
              )}`}
            </text>
          )
        })()}
      </Show>

      <Show when={reset() !== undefined}>
        <text style={{ fg: t().textMuted }}>{reset()}</text>
      </Show>
    </box>
  )
}
