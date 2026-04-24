declare global {
  interface Window {
    __STOCK_CONFIG__?: {
      alpacaApiKey?: string
      alpacaApiSecret?: string
      fredApiKey?: string
      newsApiKey?: string
      serverUrl?: string
      ticker?: string
    }
  }
}

export function getConfig() {
  return {
    alpacaApiKey: import.meta.env.VITE_ALPACA_API_KEY ?? window.__STOCK_CONFIG__?.alpacaApiKey ?? "",
    alpacaApiSecret: import.meta.env.VITE_ALPACA_API_SECRET ?? window.__STOCK_CONFIG__?.alpacaApiSecret ?? "",
    fredApiKey: import.meta.env.VITE_FRED_API_KEY ?? window.__STOCK_CONFIG__?.fredApiKey ?? "",
    newsApiKey: import.meta.env.VITE_NEWS_API_KEY ?? window.__STOCK_CONFIG__?.newsApiKey ?? "",
    serverUrl: import.meta.env.VITE_OPENCODE_SERVER_URL ?? window.__STOCK_CONFIG__?.serverUrl ?? "",
    ticker: import.meta.env.VITE_INITIAL_TICKER ?? window.__STOCK_CONFIG__?.ticker ?? "",
  }
}
