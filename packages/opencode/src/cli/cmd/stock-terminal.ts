import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { UI } from "../ui"
import { Server } from "../../server/server"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { Flag } from "../../flag/flag"
import { EOL } from "os"

export const StockTerminalCommand = cmd({
  command: "stock-terminal [ticker]",
  describe: "launch Bloomberg-style financial terminal with AI analyst",
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
      .option("theme", {
        type: "string",
        description: "terminal theme (default: bloomberg)",
        default: "bloomberg",
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
          "  ║        Bloomberg-Style AI Analyst                 ║",
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
            "  Set these environment variables to enable full functionality.",
        )
        UI.println(
          UI.Style.TEXT_DIM +
            "  The analyst agent will still work but financial tools will return errors.",
        )
        UI.empty()
      }

      // Start the server
      const server = await Server.listen({})
      const sdk = createOpencodeClient({ baseUrl: server.url.toString() })

      // Create a session
      const session = await sdk.session.create({})

      UI.println(
        UI.Style.TEXT_INFO_BOLD +
          `  Session: ${session.id}`,
      )
      UI.println(
        UI.Style.TEXT_DIM +
          `  Agent: analyst  |  Theme: ${args.theme}`,
      )
      UI.empty()

      // If a ticker was provided, send the initial query
      if (args.ticker) {
        const ticker = args.ticker.toUpperCase()
        UI.println(
          UI.Style.TEXT_WARNING_BOLD +
            `  Analyzing ${ticker}...`,
        )
        UI.empty()

        const prompt = `Analyze the stock ${ticker}. Provide a full quote, macro context, and sentiment analysis.`
        await sdk.session.chat({
          sessionID: session.id,
          parts: [{ type: "text", text: prompt }],
          agent: "analyst",
        })

        // Stream the response
        const sub = sdk.session.subscribe(session.id)
        for await (const event of sub) {
          if (event.type === "event") {
            const data = event.data
            if ("part" in data && data.part && "text" in data.part) {
              process.stdout.write(data.part.text)
            }
          }
        }
        UI.empty()
      }

      UI.println(
        UI.Style.TEXT_DIM +
          "  Type a ticker or financial query. Use Ctrl+C to exit.",
      )
      UI.empty()

      // Interactive REPL loop
      const readline = await import("readline")
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: UI.Style.TEXT_WARNING_BOLD + "  ❯ " + UI.Style.TEXT_NORMAL,
      })

      rl.prompt()
      rl.on("line", async (line: string) => {
        const input = line.trim()
        if (!input) {
          rl.prompt()
          return
        }

        // Check for special commands
        if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
          rl.close()
          return
        }

        // Determine if this is a ticker or a full query
        const isTicker = /^[A-Z]{1,5}$/i.test(input)
        const prompt = isTicker
          ? `Analyze the stock ${input.toUpperCase()}. Provide a full quote, macro context, and sentiment analysis.`
          : input

        UI.empty()
        try {
          await sdk.session.chat({
            sessionID: session.id,
            parts: [{ type: "text", text: prompt }],
            agent: "analyst",
          })

          const sub = sdk.session.subscribe(session.id)
          for await (const event of sub) {
            if (event.type === "event") {
              const data = event.data
              if ("part" in data && data.part && "text" in data.part) {
                process.stdout.write(data.part.text)
              }
            }
          }
        } catch (error) {
          UI.println(UI.Style.TEXT_WARNING_BOLD + `  Error: ${error}`)
        }
        UI.empty()
        rl.prompt()
      })

      rl.on("close", async () => {
        UI.empty()
        UI.println(UI.Style.TEXT_DIM + "  Terminal session closed.")
        await server.stop()
        process.exit(0)
      })
    })
  },
})
