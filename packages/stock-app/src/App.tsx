import { createSignal, Show } from "solid-js"
import "@/index.css"
import "@/types"
import { getConfig } from "@/types"
import { TopBar } from "@/components/TopBar"
import { PriceChart } from "@/components/PriceChart"
import { KeyStats } from "@/components/KeyStats"
import { NewsFeed } from "@/components/NewsFeed"
import { MacroSnapshot } from "@/components/MacroSnapshot"
import { AnalystChat } from "@/components/AnalystChat"
import { SetupScreen, getMissingKeys } from "@/components/SetupScreen"

export function App() {
  const config = getConfig()
  const initialTicker = config.ticker || new URLSearchParams(location.search).get("ticker") || ""
  const [ticker, setTicker] = createSignal(initialTicker.toUpperCase())
  const [lastUpdated, setLastUpdated] = createSignal(new Date().toLocaleTimeString())
  const missingKeys = getMissingKeys()
  const [showSetup, setShowSetup] = createSignal(missingKeys.length > 0)

  const handleTickerSubmit = (newTicker: string) => {
    setTicker(newTicker)
    setLastUpdated(new Date().toLocaleTimeString())
    const url = new URL(location.href)
    url.searchParams.set("ticker", newTicker)
    history.replaceState(null, "", url.toString())
  }

  return (
    <div class="h-dvh flex flex-col bg-bg overflow-hidden">
      <Show when={showSetup()}>
        <SetupScreen missingKeys={missingKeys} onDismiss={() => setShowSetup(false)} />
      </Show>

      <TopBar
        ticker={ticker()}
        onTickerSubmit={handleTickerSubmit}
        lastUpdated={lastUpdated()}
      />

      <div class="flex flex-1 min-h-0">
        {/* Left panel - 60% */}
        <div class="flex flex-col w-[60%] border-r border-border min-h-0">
          {/* Price Chart */}
          <div class="flex-1 min-h-0 border-b border-border">
            <Show when={ticker()} fallback={
              <div class="h-full flex items-center justify-center text-text-muted text-sm">
                Enter a ticker symbol to get started
              </div>
            }>
              <PriceChart ticker={ticker()} />
            </Show>
          </div>

          {/* Key Stats */}
          <Show when={ticker()}>
            <div class="border-b border-border">
              <KeyStats ticker={ticker()} />
            </div>
          </Show>

          {/* Macro Snapshot */}
          <div class="shrink-0">
            <MacroSnapshot />
          </div>
        </div>

        {/* Right panel - 40% */}
        <div class="flex flex-col w-[40%] min-h-0">
          {/* News Feed */}
          <div class="h-[40%] border-b border-border overflow-hidden">
            <Show when={ticker()} fallback={
              <div class="h-full flex items-center justify-center text-text-muted text-xs">
                News feed will appear here
              </div>
            }>
              <NewsFeed ticker={ticker()} />
            </Show>
          </div>

          {/* AI Chat */}
          <div class="flex-1 min-h-0">
            <Show when={ticker()} fallback={
              <div class="h-full flex items-center justify-center text-text-muted text-xs">
                AI analyst will appear here
              </div>
            }>
              <AnalystChat ticker={ticker()} />
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
