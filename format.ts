export type Cost = {
  input: number
  output: number
  cache?: { read: number; write: number }
}

export function formatPrice(n: number): string {
  return `$${Number(n.toFixed(2))}`
}

/** Footer shown in the list: "$in/$out" per 1M tokens, or "Free". */
export function modelFooter(cost?: Cost): string | undefined {
  if (!cost) return undefined
  if (cost.input === 0 && cost.output === 0) return "Free"
  return `${formatPrice(cost.input)}/${formatPrice(cost.output)}`
}

/** Full price description for toasts. */
export function fullPrice(cost?: Cost): string {
  if (!cost) return "no pricing data"
  if (cost.input === 0 && cost.output === 0) return "Free"
  const parts = [`in ${formatPrice(cost.input)}`, `out ${formatPrice(cost.output)}`]
  if (cost.cache) {
    parts.push(`cache read ${formatPrice(cost.cache.read)}`, `cache write ${formatPrice(cost.cache.write)}`)
  }
  return parts.join(" · ") + " per 1M tokens"
}

/** Sort key: output price, then input as a tiebreak; models without pricing sort last. */
export function priceKey(cost?: Cost): number {
  if (!cost) return Number.POSITIVE_INFINITY
  return cost.output * 1000 + cost.input
}
