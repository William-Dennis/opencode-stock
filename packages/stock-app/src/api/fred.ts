import { getConfig } from "@/types"

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"

function apiKey() {
  return getConfig().fredApiKey
}

export interface MacroIndicator {
  name: string
  label: string
  value: string
  date: string
}

async function fetchSeries(seriesId: string): Promise<{ value: string; date: string } | null> {
  const url = new URL(FRED_BASE)
  url.searchParams.set("series_id", seriesId)
  url.searchParams.set("api_key", apiKey())
  url.searchParams.set("file_type", "json")
  url.searchParams.set("sort_order", "desc")
  url.searchParams.set("limit", "1")

  const resp = await fetch(url.toString())
  if (!resp.ok) return null
  const data = await resp.json()
  const obs = data.observations?.[0]
  if (!obs || obs.value === ".") return null
  return { value: obs.value, date: obs.date }
}

export async function fetchMacroIndicators(): Promise<MacroIndicator[]> {
  const series = [
    { id: "FEDFUNDS", name: "fed_funds", label: "Fed Funds Rate" },
    { id: "CPIAUCSL", name: "cpi", label: "CPI (YoY)" },
    { id: "DGS10", name: "treasury_10y", label: "10Y Treasury" },
    { id: "DTWEXBGS", name: "usd_index", label: "USD Index" },
  ]

  const results = await Promise.allSettled(series.map(async (s) => {
    const data = await fetchSeries(s.id)
    if (!data) return null
    return { name: s.name, label: s.label, value: data.value, date: data.date }
  }))

  return results
    .filter((r): r is PromiseFulfilledResult<MacroIndicator | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is MacroIndicator => v !== null)
}
