import { Show } from "solid-js"

import { getConfig } from "@/types"

interface MissingKey {
  name: string
  envVar: string
  description: string
  url: string
}

export function SetupScreen(props: { missingKeys: MissingKey[]; onDismiss: () => void }) {
  return (
    <div class="fixed inset-0 bg-bg/95 flex items-center justify-center z-50">
      <div class="bg-panel border border-border rounded-lg max-w-lg w-full mx-4 overflow-hidden">
        <div class="px-6 py-4 border-b border-border">
          <div class="flex items-center gap-3">
            <span class="text-orange text-2xl">⚙</span>
            <div>
              <h2 class="text-orange font-bold text-sm">API Keys Required</h2>
              <p class="text-text-muted text-xs mt-0.5">
                Configure the following environment variables to enable all features.
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 space-y-3">
          {props.missingKeys.map((key) => (
            <div class="bg-element border border-border rounded px-4 py-3">
              <div class="flex items-center justify-between mb-1">
                <code class="text-amber text-xs font-bold">{key.envVar}</code>
                <a
                  href={key.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue text-[10px] hover:underline"
                >
                  Get API Key →
                </a>
              </div>
              <p class="text-text-muted text-xs">{key.description}</p>
            </div>
          ))}
        </div>

        <div class="px-6 py-4 border-t border-border bg-element/50">
          <div class="flex items-center justify-between">
            <p class="text-text-muted text-xs">
              Set these variables in your shell or <code class="text-amber">.env</code> file.
            </p>
            <button
              onClick={props.onDismiss}
              class="bg-orange text-bg px-4 py-1.5 rounded text-xs font-bold hover:brightness-110 transition-all"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function getMissingKeys(): MissingKey[] {
  const config = getConfig()
  const missing: MissingKey[] = []

  if (!config.alpacaApiKey || !config.alpacaApiSecret) {
    missing.push({
      name: "Alpaca Markets",
      envVar: "ALPACA_API_KEY / ALPACA_API_SECRET",
      description: "Required for live stock quotes, price charts, and market data.",
      url: "https://alpaca.markets",
    })
  }

  if (!config.fredApiKey) {
    missing.push({
      name: "FRED",
      envVar: "FRED_API_KEY",
      description: "Required for macroeconomic indicators (Fed funds rate, CPI, 10Y yield, USD index).",
      url: "https://fred.stlouisfed.org/docs/api/api_key.html",
    })
  }

  if (!config.newsApiKey) {
    missing.push({
      name: "News API",
      envVar: "NEWS_API_KEY",
      description: "Required for real-time financial news headlines with sentiment analysis.",
      url: "https://newsapi.org/register",
    })
  }

  return missing
}
