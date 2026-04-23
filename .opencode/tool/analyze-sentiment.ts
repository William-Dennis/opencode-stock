/// <reference path="../env.d.ts" />
import { tool } from "@opencode-ai/plugin"

interface NewsArticle {
  title: string
  description: string | null
  source: { name: string }
  publishedAt: string
  url: string
}

interface NewsResponse {
  status: string
  totalResults: number
  articles: NewsArticle[]
}

async function fetchNews(query: string, limit: number) {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) {
    throw new Error(
      "NEWS_API_KEY environment variable is required. " +
        "Get a free API key at https://newsapi.org/register",
    )
  }
  const encodedQuery = encodeURIComponent(query)
  const url = `https://newsapi.org/v2/everything?q=${encodedQuery}&sortBy=publishedAt&pageSize=${limit}&language=en&apiKey=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as NewsResponse
}

function scoreSentimentKeywords(text: string): number {
  const lower = text.toLowerCase()
  const bullish = [
    "surge",
    "soar",
    "rally",
    "beat",
    "record",
    "upgrade",
    "growth",
    "gains",
    "bullish",
    "outperform",
    "exceeded",
    "strong",
    "profit",
    "optimistic",
    "expansion",
    "breakout",
    "high",
    "positive",
    "boost",
    "innovation",
  ]
  const bearish = [
    "crash",
    "plunge",
    "drop",
    "miss",
    "downgrade",
    "decline",
    "losses",
    "bearish",
    "underperform",
    "weak",
    "risk",
    "recession",
    "layoff",
    "warning",
    "concern",
    "selloff",
    "low",
    "negative",
    "fear",
    "uncertainty",
  ]

  let score = 0
  for (const word of bullish) {
    if (lower.includes(word)) score += 1
  }
  for (const word of bearish) {
    if (lower.includes(word)) score -= 1
  }
  return score
}

function sentimentLabel(score: number): string {
  if (score >= 0.3) return "BULLISH"
  if (score <= -0.3) return "BEARISH"
  return "NEUTRAL"
}

function sentimentIcon(score: number): string {
  if (score >= 0.3) return "▲"
  if (score <= -0.3) return "▼"
  return "●"
}

export default tool({
  description: `Analyze market sentiment for a stock ticker or topic by scanning recent news headlines.

Uses NewsAPI to fetch recent articles, then applies keyword-based sentiment scoring to produce a composite sentiment score from -1.0 (very bearish) to +1.0 (very bullish).

Returns: sentiment score, label (BULLISH/NEUTRAL/BEARISH), headline summary, and individual article scores.

Requires NEWS_API_KEY environment variable. Get a free key at https://newsapi.org/register`,
  args: {
    query: tool.schema.string().describe("Ticker symbol or topic to analyze (e.g., AAPL, 'Federal Reserve rate decision')"),
    limit: tool.schema.number().describe("Number of recent articles to analyze (max 20)").default(10),
  },
  async execute(args) {
    const articleLimit = Math.min(args.limit, 20)
    const data = await fetchNews(args.query, articleLimit)

    if (data.totalResults === 0 || data.articles.length === 0) {
      return `No recent news found for "${args.query}". Sentiment: NEUTRAL (no signal).`
    }

    const scored = data.articles.map((article) => {
      const text = `${article.title} ${article.description ?? ""}`
      const rawScore = scoreSentimentKeywords(text)
      // Normalize raw keyword count to [-1, 1] range. Dividing by 5 assumes a typical
      // article triggers at most ~5 keyword matches, so the score saturates at ±1.0.
      const normalizedScore = Math.max(-1, Math.min(1, rawScore / 5))
      return {
        title: article.title,
        source: article.source.name,
        date: article.publishedAt.slice(0, 10),
        score: normalizedScore,
      }
    })

    const avgScore = scored.reduce((sum, a) => sum + a.score, 0) / scored.length
    const label = sentimentLabel(avgScore)
    const icon = sentimentIcon(avgScore)

    const headlines = scored
      .slice(0, 5)
      .map((a) => {
        const si = sentimentIcon(a.score)
        return `  ${si} [${a.score >= 0 ? "+" : ""}${a.score.toFixed(2)}] ${a.title.slice(0, 70)}`
      })
      .join("\n")

    const lines = [
      `═══════════════════════════════════════════════`,
      `  SENTIMENT ANALYSIS: ${args.query.toUpperCase()}`,
      `═══════════════════════════════════════════════`,
      `  Composite Score: ${avgScore >= 0 ? "+" : ""}${avgScore.toFixed(2)}  ${icon} ${label}`,
      `  Articles Analyzed: ${scored.length}`,
      `───────────────────────────────────────────────`,
      `  TOP HEADLINES:`,
      headlines,
      `───────────────────────────────────────────────`,
      `  Source: NewsAPI  |  As of ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
    ]

    return lines.join("\n")
  },
})
