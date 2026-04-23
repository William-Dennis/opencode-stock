import { createSignal, createEffect, Show, For } from "solid-js"
import { fetchMacroIndicators, type MacroIndicator } from "@/api/fred"

export function MacroSnapshot() {
  const [indicators, setIndicators] = createSignal<MacroIndicator[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")

  createEffect(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchMacroIndicators()
      setIndicators(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load macro data")
    } finally {
      setLoading(false)
    }
  })

  return (
    <div class="p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-text-muted text-xs font-bold tracking-wider">MACRO SNAPSHOT</span>
        <Show when={loading()}>
          <span class="text-text-muted text-xs animate-pulse">Loading...</span>
        </Show>
      </div>
      <Show when={error()}>
        <div class="text-red text-xs mb-2">{error()}</div>
      </Show>
      <div class="grid grid-cols-4 gap-2">
        <For each={indicators()}>
          {(ind) => (
            <div class="bg-element border border-border rounded px-3 py-2">
              <div class="text-text-muted text-[10px] mb-1">{ind.label}</div>
              <div class="text-cyan font-bold text-sm">
                {parseFloat(ind.value).toFixed(2)}
                {ind.name === "fed_funds" || ind.name === "treasury_10y" ? "%" : ""}
              </div>
            </div>
          )}
        </For>
        <Show when={!loading() && indicators().length === 0 && !error()}>
          <div class="col-span-4 text-text-muted text-xs text-center py-2">
            No macro data available
          </div>
        </Show>
      </div>
    </div>
  )
}
