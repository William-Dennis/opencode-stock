import { createSignal, type JSX } from "solid-js"

export function TopBar(props: {
  ticker: string
  onTickerSubmit: (ticker: string) => void
  lastUpdated: string
}) {
  const [input, setInput] = createSignal("")

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (e) => {
    e.preventDefault()
    const val = input().trim().toUpperCase()
    if (val) {
      props.onTickerSubmit(val)
      setInput("")
    }
  }

  return (
    <div class="flex items-center justify-between h-10 px-4 bg-panel border-b border-border shrink-0">
      <div class="flex items-center gap-4">
        <span class="text-orange font-bold text-sm tracking-wider">OPENCODE TERMINAL</span>
        <form onSubmit={handleSubmit} class="flex items-center gap-2">
          <input
            type="text"
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            placeholder="Search ticker..."
            class="bg-element border border-border rounded px-2 py-1 text-xs text-text w-32 outline-none focus:border-orange placeholder:text-text-muted"
          />
          <button
            type="submit"
            class="bg-orange text-bg px-3 py-1 rounded text-xs font-bold hover:brightness-110 transition-all"
          >
            GO
          </button>
        </form>
        <span class="text-amber font-bold text-base tracking-wide">{props.ticker || "—"}</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span class="text-text-muted text-xs">MARKET OPEN</span>
        </div>
        <span class="text-text-muted text-xs">{props.lastUpdated}</span>
      </div>
    </div>
  )
}
