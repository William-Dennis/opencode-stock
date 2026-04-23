import { getConfig } from "@/types"

const NEWS_BASE = "https://newsapi.org/v2/everything"

function apiKey() {
  return getConfig().newsApiKey
}

export type Sentiment = "bullish" | "bearish" | "neutral"

export interface NewsArticle {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  sentiment: Sentiment
}

function classifySentiment(title: string, description: string): Sentiment {
  const text = `${title} ${description}`.toLowerCase()
  const bullish = [
    "surge", "rally", "gain", "rise", "jump", "soar", "bull", "upgrade",
    "beat", "record", "high", "growth", "profit", "strong", "boom", "buy",
    "outperform", "positive", "up", "optimistic",
  ]
  const bearish = [
    "drop", "fall", "decline", "crash", "plunge", "bear", "downgrade",
    "miss", "loss", "low", "weak", "sell", "cut", "risk", "fear",
    "negative", "down", "pessimistic", "slump", "recession",
  ]

  const bullScore = bullish.filter((w) => text.includes(w)).length
  const bearScore = bearish.filter((w) => text.includes(w)).length

  if (bullScore > bearScore) return "bullish"
  if (bearScore > bullScore) return "bearish"
  return "neutral"
}

export async function fetchNews(query: string, pageSize = 15): Promise<NewsArticle[]> {
  const url = new URL(NEWS_BASE)
  url.searchParams.set("q", query)
  url.searchParams.set("apiKey", apiKey())
  url.searchParams.set("pageSize", String(pageSize))
  url.searchParams.set("sortBy", "publishedAt")
  url.searchParams.set("language", "en")

  const resp = await fetch(url.toString())
  if (!resp.ok) throw new Error(`News API error: ${resp.status}`)
  const data = await resp.json()

  return (data.articles ?? []).map((a: Record<string, unknown>) => ({
    title: a.title as string,
    description: (a.description as string) ?? "",
    url: a.url as string,
    source: (a.source as Record<string, string>)?.name ?? "Unknown",
    publishedAt: a.publishedAt as string,
    sentiment: classifySentiment(a.title as string, (a.description as string) ?? ""),
  }))
}
