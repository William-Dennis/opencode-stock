import { createSignal, createEffect, Show, For } from "solid-js"
import { fetchSnapshot, type Quote } from "@/api/alpaca"

function StatCard(props: { label: string; value: string; color?: string }) {
  return (
    <div class="bg-element border border-border rounded px-3 py-2">
      <div class="text-text-muted text-xs mb-1">{props.label}</div>
      <div class={`font-bold text-sm ${props.color ?? "text-text"}`}>{props.value}</div>
    </div>
  )
}

const fmt = (n: number | undefined, decimals = 2) =>
  n !== undefined ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : "—"

const fmtVol = (n: number | undefined) =>
  n !== undefined ? (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n.toLocaleString()) : "—"

export function KeyStats(props: { ticker: string }) {
  const [quote, setQuote] = createSignal<Quote | null>(null)
  const [error, setError] = createSignal("")

  createEffect(async () => {
    if (!props.ticker) return
    setError("")
    try {
      const data = await fetchSnapshot(props.ticker)
      setQuote(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quote")
    }
  })

  return (
    <div class="p-3">
      <div class="text-text-muted text-xs font-bold mb-2 tracking-wider">KEY STATS</div>
      <Show when={error()}>
        <div class="text-red text-xs">{error()}</div>
      </Show>
      <Show when={quote()}>
        {(q) => {
          const changeColor = q().change >= 0 ? "text-green" : "text-red"
          const changeSign = q().change >= 0 ? "+" : ""

          const stats = [
            { label: "Last Price", value: `$${fmt(q().last)}`, color: "text-amber" },
            { label: "Change", value: `${changeSign}${fmt(q().change)} (${changeSign}${fmt(q().changePercent)}%)`, color: changeColor },
            { label: "Day High", value: `$${fmt(q().high)}` },
            { label: "Day Low", value: `$${fmt(q().low)}` },
            { label: "Volume", value: fmtVol(q().volume) },
            { label: "Prev Close", value: `$${fmt(q().prevClose)}` },
            { label: "52W High", value: q().week52High ? `$${fmt(q().week52High)}` : "—" },
            { label: "52W Low", value: q().week52Low ? `$${fmt(q().week52Low)}` : "—" },
          ]

          return (
            <div class="grid grid-cols-4 gap-2">
              <For each={stats}>
                {(s) => <StatCard label={s.label} value={s.value} color={s.color} />}
              </For>
            </div>
          )
        }}
      </Show>
    </div>
  )
}
