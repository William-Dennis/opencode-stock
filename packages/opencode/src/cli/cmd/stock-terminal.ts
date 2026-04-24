import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { UI } from "../ui"
import { Server } from "../../server/server"
import open from "open"
import { spawn } from "child_process"
import path from "path"

export const StockTerminalCommand = cmd({
  command: "stock-terminal [ticker]",
  describe: "launch Bloomberg-style financial terminal web app with AI analyst",
  builder: (yargs) =>
    yargs
      .positional("ticker", {
        type: "string",
        describe: "initial ticker symbol to analyze (e.g., AAPL, MSFT, TSLA)",
      })
      .option("dir", {
        type: "string",
        description: "directory to run in",
      })
      .option("port", {
        type: "number",
        description: "port for the stock app dev server",
        default: 4097,
      }),
  handler: async (args) => {
    const directory = args.dir ?? process.cwd()

    await bootstrap(directory, async () => {
      UI.empty()
      UI.println(
        UI.Style.TEXT_WARNING_BOLD +
          "  ╔═══════════════════════════════════════════════════╗",
      )
      UI.println(
        UI.Style.TEXT_WARNING_BOLD +
          "  ║        OPENCODE FINANCIAL TERMINAL                ║",
      )
      UI.println(
        UI.Style.TEXT_WARNING_BOLD +
          "  ║        Bloomberg-Style Web App                    ║",
      )
      UI.println(
        UI.Style.TEXT_WARNING_BOLD +
          "  ╚═══════════════════════════════════════════════════╝",
      )
      UI.empty()

      // Validate required API keys
      const missing: string[] = []
      if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_API_SECRET) {
        missing.push("ALPACA_API_KEY / ALPACA_API_SECRET (for live quotes — https://alpaca.markets)")
      }
      if (!process.env.FRED_API_KEY) {
        missing.push("FRED_API_KEY (for macro data — https://fred.stlouisfed.org/docs/api/api_key.html)")
      }
      if (!process.env.NEWS_API_KEY) {
        missing.push("NEWS_API_KEY (for sentiment analysis — https://newsapi.org/register)")
      }

      if (missing.length > 0) {
        UI.println(UI.Style.TEXT_WARNING_BOLD + "  ⚠  Missing API keys:")
        for (const key of missing) {
          UI.println(UI.Style.TEXT_DIM + `     • ${key}`)
        }
        UI.empty()
        UI.println(
          UI.Style.TEXT_DIM +
            "  Set these environment variables for full functionality.",
        )
        UI.println(
          UI.Style.TEXT_DIM +
            "  The web app will show a setup screen for missing keys.",
        )
        UI.empty()
      }

      // Start the OpenCode backend server
      const server = await Server.listen({})
      const serverUrl = server.url.toString()

      UI.println(UI.Style.TEXT_INFO_BOLD + `  OpenCode server: ${serverUrl}`)

      // Start the Vite dev server for the stock-app
      const stockAppDir = path.resolve(import.meta.dirname, "../../../../stock-app")
      const appPort = args.port

      const env: Record<string, string> = {
        ...(Object.fromEntries(
          Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
        )),
        VITE_OPENCODE_SERVER_URL: serverUrl,
        VITE_ALPACA_API_KEY: process.env.ALPACA_API_KEY ?? "",
        VITE_ALPACA_API_SECRET: process.env.ALPACA_API_SECRET ?? "",
        VITE_FRED_API_KEY: process.env.FRED_API_KEY ?? "",
        VITE_NEWS_API_KEY: process.env.NEWS_API_KEY ?? "",
        VITE_INITIAL_TICKER: args.ticker?.toUpperCase() ?? "",
      }

      const viteProcess = spawn("bun", ["run", "vite", "--port", String(appPort), "--host", "0.0.0.0"], {
        cwd: stockAppDir,
        env,
        stdio: "pipe",
      })

      let viteReady = false
      viteProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString()
        if (!viteReady && output.includes("Local:")) {
          viteReady = true
          const ticker = args.ticker?.toUpperCase() ?? ""
          const appUrl = `http://localhost:${appPort}${ticker ? `?ticker=${ticker}` : ""}`

          UI.println(UI.Style.TEXT_INFO_BOLD + `  Stock terminal:  ${appUrl}`)
          UI.empty()
          UI.println(UI.Style.TEXT_DIM + "  Opening browser...")
          UI.empty()

          open(appUrl).catch(() => {})
        }
      })

      viteProcess.stderr?.on("data", (data: Buffer) => {
        const output = data.toString()
        if (output.includes("error") || output.includes("Error")) {
          UI.println(UI.Style.TEXT_WARNING_BOLD + `  Vite: ${output.trim()}`)
        }
      })

      // Handle cleanup
      const cleanup = async () => {
        viteProcess.kill()
        await server.stop()
        process.exit(0)
      }

      process.on("SIGINT", cleanup)
      process.on("SIGTERM", cleanup)

      UI.println(UI.Style.TEXT_DIM + "  Press Ctrl+C to exit.")
      UI.empty()

      // Keep the process running
      await new Promise(() => {})
    })
  },
})
