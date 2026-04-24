import { createSignal, createEffect, Show, For } from "solid-js"
import { fetchNews, type NewsArticle, type Sentiment } from "@/api/news"

function SentimentBadge(props: { sentiment: Sentiment }) {
  const colors: Record<Sentiment, string> = {
    bullish: "bg-green/20 text-green border-green/30",
    bearish: "bg-red/20 text-red border-red/30",
    neutral: "bg-blue/20 text-blue border-blue/30",
  }

  return (
    <span class={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${colors[props.sentiment]}`}>
      {props.sentiment}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NewsFeed(props: { ticker: string }) {
  const [articles, setArticles] = createSignal<NewsArticle[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")

  createEffect(async () => {
    if (!props.ticker) return
    setLoading(true)
    setError("")
    try {
      const data = await fetchNews(props.ticker)
      setArticles(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news")
    } finally {
      setLoading(false)
    }
  })

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between px-3 py-2 border-b border-border">
        <span class="text-text-muted text-xs font-bold tracking-wider">NEWS FEED</span>
        <Show when={loading()}>
          <span class="text-text-muted text-xs animate-pulse">Updating...</span>
        </Show>
      </div>
      <Show when={error()}>
        <div class="px-3 py-2 text-red text-xs">{error()}</div>
      </Show>
      <div class="flex-1 overflow-y-auto">
        <For each={articles()}>
          {(article) => (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              class="block px-3 py-2 border-b border-border-subtle hover:bg-element transition-colors"
            >
              <div class="flex items-start justify-between gap-2 mb-1">
                <h3 class="text-text text-xs font-medium leading-snug line-clamp-2 flex-1">
                  {article.title}
                </h3>
                <SentimentBadge sentiment={article.sentiment} />
              </div>
              <div class="flex items-center gap-2 text-text-muted text-[10px]">
                <span>{article.source}</span>
                <span>•</span>
                <span>{timeAgo(article.publishedAt)}</span>
              </div>
            </a>
          )}
        </For>
        <Show when={!loading() && articles().length === 0 && !error()}>
          <div class="px-3 py-8 text-center text-text-muted text-xs">
            No news articles found
          </div>
        </Show>
      </div>
    </div>
  )
}
