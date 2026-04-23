/// <reference path="../env.d.ts" />
import { tool } from "@opencode-ai/plugin"

interface FredObservation {
  date: string
  value: string
}

interface FredResponse {
  observations: FredObservation[]
}

async function fredFetch(seriesId: string) {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    throw new Error(
      "FRED_API_KEY environment variable is required. " +
        "Get a free API key at https://fred.stlouisfed.org/docs/api/api_key.html",
    )
  }
  const url =
    `https://api.stlouisfed.org/fred/series/observations?` +
    `series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`FRED API error for ${seriesId}: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as FredResponse
  const obs = data.observations[0]
  if (!obs || obs.value === ".") return { date: "N/A", value: "N/A" }
  return { date: obs.date, value: obs.value }
}

const SERIES: Record<string, { id: string; label: string; suffix: string }> = {
  ffr: { id: "FEDFUNDS", label: "Fed Funds Rate", suffix: "%" },
  ten_year: { id: "DGS10", label: "10Y Treasury Yield", suffix: "%" },
  two_year: { id: "DGS2", label: "2Y Treasury Yield", suffix: "%" },
  cpi: { id: "CPIAUCSL", label: "CPI (All Urban)", suffix: "" },
  cpi_yoy: { id: "CPIAUCNS", label: "CPI YoY Change", suffix: "%" },
  unemployment: { id: "UNRATE", label: "Unemployment Rate", suffix: "%" },
  gdp: { id: "GDP", label: "GDP (Billions)", suffix: "" },
  sp500: { id: "SP500", label: "S&P 500", suffix: "" },
  vix: { id: "VIXCLS", label: "VIX", suffix: "" },
}

export default tool({
  description: `Fetch current U.S. macroeconomic indicators from the FRED API (Federal Reserve Economic Data).

Returns the latest values for: Fed Funds Rate, 10-Year Treasury Yield, 2-Year Treasury Yield, CPI, Unemployment Rate, GDP, S&P 500, and VIX.

Requires FRED_API_KEY environment variable. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html

Optionally filter to specific indicators using the 'indicators' parameter.`,
  args: {
    indicators: tool.schema
      .array(
        tool.schema.enum([
          "ffr",
          "ten_year",
          "two_year",
          "cpi",
          "cpi_yoy",
          "unemployment",
          "gdp",
          "sp500",
          "vix",
        ]),
      )
      .describe(
        "Specific indicators to fetch. Options: ffr, ten_year, two_year, cpi, cpi_yoy, unemployment, gdp, sp500, vix. Defaults to core set: ffr, ten_year, two_year, cpi_yoy, unemployment, vix.",
      )
      .default(["ffr", "ten_year", "two_year", "cpi_yoy", "unemployment", "vix"]),
  },
  async execute(args) {
    const results = await Promise.all(
      args.indicators.map(async (key) => {
        const series = SERIES[key]
        if (!series) return null
        const obs = await fredFetch(series.id)
        return { ...series, ...obs }
      }),
    )

    const valid = results.filter((r): r is NonNullable<typeof r> => r !== null)

    if (valid.length === 0) return "No macro data available."

    const lines = [
      `═══════════════════════════════════════════════`,
      `  U.S. MACRO SNAPSHOT`,
      `═══════════════════════════════════════════════`,
      ...valid.map((r) => `  ${r.label.padEnd(22)} ${r.value}${r.suffix}  (${r.date})`),
      `───────────────────────────────────────────────`,
      `  Source: FRED (Federal Reserve Economic Data)`,
      `  As of ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
    ]

    return lines.join("\n")
  },
})
