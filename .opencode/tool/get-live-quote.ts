/// <reference path="../env.d.ts" />
import { tool } from "@opencode-ai/plugin"

interface AlpacaQuote {
  symbol: string
  last: { price: number; size: number; timestamp: string }
  bid: { price: number; size: number }
  ask: { price: number; size: number }
}

interface AlpacaSnapshot {
  latestTrade: { p: number; s: number; t: string }
  latestQuote: { bp: number; bs: number; ap: number; as: number }
  dailyBar: { o: number; h: number; l: number; c: number; v: number; t: string }
  prevDailyBar: { c: number }
}

async function alpacaFetch(endpoint: string) {
  const apiKey = process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error(
      "ALPACA_API_KEY and ALPACA_API_SECRET environment variables are required. " +
        "Get free API keys at https://alpaca.markets",
    )
  }
  const baseUrl = process.env.ALPACA_BASE_URL ?? "https://data.alpaca.markets"
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
      Accept: "application/json",
    },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`Alpaca API error: ${response.status} ${response.statusText} — ${body}`)
  }
  return response.json()
}

function formatNumber(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatVolume(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toString()
}

export default tool({
  description: `Fetch a real-time stock quote from Alpaca Markets.

Returns: last price, bid/ask, open/high/low/close, volume, 52-week range, and change from previous close.

Requires ALPACA_API_KEY and ALPACA_API_SECRET environment variables.
If the API keys are not configured, returns a clear error message with setup instructions.`,
  args: {
    ticker: tool.schema.string().describe("Stock ticker symbol (e.g., AAPL, MSFT, TSLA)"),
  },
  async execute(args) {
    const ticker = args.ticker.toUpperCase().trim()

    const snapshot = (await alpacaFetch(`/v2/stocks/${ticker}/snapshot`)) as AlpacaSnapshot

    const last = snapshot.latestTrade.p
    const prevClose = snapshot.prevDailyBar.c
    const change = last - prevClose
    const changePct = (change / prevClose) * 100
    const direction = change >= 0 ? "▲" : "▼"

    const bar = snapshot.dailyBar
    const bid = snapshot.latestQuote.bp
    const ask = snapshot.latestQuote.ap
    const spread = ask - bid

    const lines = [
      `═══════════════════════════════════════════════`,
      `  ${ticker}`,
      `  Last: $${formatNumber(last)}  ${direction} ${formatNumber(Math.abs(change))} (${formatNumber(Math.abs(changePct))}%)  Vol: ${formatVolume(bar.v)}`,
      `═══════════════════════════════════════════════`,
      `  Bid: $${formatNumber(bid)}    Ask: $${formatNumber(ask)}    Spread: ${formatNumber(spread)}`,
      `  Open: $${formatNumber(bar.o)}   High: $${formatNumber(bar.h)}   Low: $${formatNumber(bar.l)}`,
      `  Prev Close: $${formatNumber(prevClose)}`,
      `───────────────────────────────────────────────`,
      `  As of ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
    ]

    return lines.join("\n")
  },
})
