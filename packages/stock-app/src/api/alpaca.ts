import { getConfig } from "@/types"

const ALPACA_BASE = "https://data.alpaca.markets"

function headers() {
  const config = getConfig()
  return {
    "APCA-API-KEY-ID": config.alpacaApiKey,
    "APCA-API-SECRET-KEY": config.alpacaApiSecret,
  }
}

export interface Bar {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

export interface Quote {
  symbol: string
  last: number
  prevClose: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  marketCap?: number
  pe?: number
  eps?: number
  week52High?: number
  week52Low?: number
  avgVolume?: number
}

export async function fetchBars(symbol: string, timeframe: string, start: string, end: string): Promise<Bar[]> {
  const url = new URL(`/v2/stocks/${symbol}/bars`, ALPACA_BASE)
  url.searchParams.set("timeframe", timeframe)
  url.searchParams.set("start", start)
  url.searchParams.set("end", end)
  url.searchParams.set("feed", "iex")
  url.searchParams.set("limit", "1000")

  const resp = await fetch(url.toString(), { headers: headers() })
  if (!resp.ok) throw new Error(`Alpaca bars error: ${resp.status}`)
  const data = await resp.json()
  return data.bars ?? []
}

export async function fetchSnapshot(symbol: string): Promise<Quote> {
  const url = new URL(`/v2/stocks/${symbol}/snapshot`, ALPACA_BASE)
  url.searchParams.set("feed", "iex")

  const resp = await fetch(url.toString(), { headers: headers() })
  if (!resp.ok) throw new Error(`Alpaca snapshot error: ${resp.status}`)
  const data = await resp.json()

  const last = data.latestTrade?.p ?? data.minuteBar?.c ?? 0
  const prevClose = data.prevDailyBar?.c ?? 0
  const change = last - prevClose
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0

  return {
    symbol,
    last,
    prevClose,
    change,
    changePercent,
    high: data.dailyBar?.h ?? 0,
    low: data.dailyBar?.l ?? 0,
    volume: data.dailyBar?.v ?? 0,
    week52High: data.prevDailyBar?.h,
    week52Low: data.prevDailyBar?.l,
  }
}

function getTimeRange(period: string): { start: string; end: string; timeframe: string } {
  const now = new Date()
  const end = now.toISOString()
  const ms = {
    "1D": 1,
    "5D": 5,
    "1M": 30,
    "3M": 90,
    "1Y": 365,
  }[period] ?? 30

  const start = new Date(now.getTime() - ms * 24 * 60 * 60 * 1000).toISOString()
  const timeframe = ms <= 1 ? "15Min" : ms <= 5 ? "1Hour" : "1Day"
  return { start, end, timeframe }
}

export async function fetchChartData(symbol: string, period: string): Promise<Bar[]> {
  const { start, end, timeframe } = getTimeRange(period)
  return fetchBars(symbol, timeframe, start, end)
}
