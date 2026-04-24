/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENCODE_SERVER_URL: string
  readonly VITE_ALPACA_API_KEY: string
  readonly VITE_ALPACA_API_SECRET: string
  readonly VITE_FRED_API_KEY: string
  readonly VITE_NEWS_API_KEY: string
  readonly VITE_INITIAL_TICKER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
