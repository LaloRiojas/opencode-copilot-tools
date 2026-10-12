/**
 * Pure formatting helpers for the quota widget. No rendering deps.
 */

import type { QuotaSnapshot } from "./quota.js"

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US")
}

/** Capitalize the plan's first letter: "business" -> "Business". */
export function formatPlan(plan: string): string {
  const trimmed = plan.trim()
  if (trimmed === "") return "Unknown"
  return trimmed[0].toUpperCase() + trimmed.slice(1)
}

/** Percentage USED (0-100), derived from percent_remaining. */
export function percentUsed(s: QuotaSnapshot): number {
  return Math.max(0, Math.min(100, Math.round(100 - s.percent_remaining)))
}

/**
 * Split progress bar into filled/empty runs for two-color rendering.
 */
export function progressBarParts(
  percentUsedValue: number,
  width = 10,
): { filled: string; empty: string } {
  const clamped = Math.max(0, Math.min(100, percentUsedValue))
  const n = Math.round((clamped / 100) * width)
  return { filled: "█".repeat(n), empty: "░".repeat(width - n) }
}

/** Days until reset date (YYYY-MM-DD), or undefined if unparseable. */
export function daysUntil(resetDate?: string): number | undefined {
  if (!resetDate) return undefined
  const target = new Date(`${resetDate}T00:00:00Z`)
  if (Number.isNaN(target.getTime())) return undefined
  const ms = target.getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function resetLabel(resetDate?: string): string | undefined {
  const days = daysUntil(resetDate)
  if (days === undefined) return undefined
  if (days === 0) return "Reset today"
  if (days === 1) return "Reset tomorrow"
  return `Reset in ${days} days`
}
