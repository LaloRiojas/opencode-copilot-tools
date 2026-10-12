/** @jsxImportSource @opentui/solid */
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { fullPrice, modelFooter, priceKey } from "./format.js"

export function PricesDialog(props: { api: TuiPluginApi }) {
  const api = props.api
  const options = [...api.state.provider]
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((provider) =>
      Object.entries(provider.models)
        .filter(([, info]) => info.status !== "deprecated")
        .sort(([, a], [, b]) => priceKey(a.cost) - priceKey(b.cost))
        .map(([id, info]) => ({
          title: info.name ?? id,
          value: `${provider.id}/${id}`,
          category: provider.name,
          footer: modelFooter(info.cost),
          onSelect: () => {
            api.ui.toast({
              title: `${info.name ?? id} (${provider.id})`,
              message: fullPrice(info.cost),
              variant: "info",
            })
          },
        })),
    )
  return <api.ui.DialogSelect title="Models with prices" placeholder="Filter models" options={options} />
}
