import { createSignal, createEffect, Show, For, onCleanup, type JSX } from "solid-js"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { getConfig } from "@/types"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export function AnalystChat(props: { ticker: string }) {
  let messagesEnd!: HTMLDivElement
  const [messages, setMessages] = createSignal<ChatMessage[]>([])
  const [input, setInput] = createSignal("")
  const [streaming, setStreaming] = createSignal(false)
  const [sessionId, setSessionId] = createSignal("")
  const [error, setError] = createSignal("")
  const [connected, setConnected] = createSignal(false)

  const serverUrl = () => getConfig().serverUrl || location.origin

  const getClient = () => createOpencodeClient({ baseUrl: serverUrl() })

  const scrollToBottom = () => {
    messagesEnd?.scrollIntoView({ behavior: "smooth" })
  }

  const initSession = async () => {
    try {
      const sdk = getClient()
      const session = await sdk.session.create({})
      setSessionId(session.data.id)
      setConnected(true)
      return session.data.id
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect to OpenCode server")
      return null
    }
  }

  const sendMessage = async (text: string) => {
    let sid = sessionId()
    if (!sid) {
      sid = (await initSession()) ?? ""
      if (!sid) return
    }

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setStreaming(true)
    setError("")

    try {
      const sdk = getClient()
      await sdk.session.chat({
        body: {
          sessionID: sid,
          parts: [{ type: "text", text }],
          agent: "analyst",
        },
      })

      let assistantText = ""
      setMessages((prev) => [...prev, { role: "assistant", content: "" }])

      const events = await sdk.session.subscribe({ sessionID: sid })
      for await (const event of events.stream) {
        if (event.type === "event") {
          const data = event.data as Record<string, unknown>
          if ("part" in data && data.part && typeof data.part === "object" && "text" in (data.part as Record<string, unknown>)) {
            assistantText += (data.part as Record<string, string>).text
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: "assistant", content: assistantText }
              return updated
            })
            scrollToBottom()
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("aborted")) return
      setError(e instanceof Error ? e.message : "Chat error")
    } finally {
      setStreaming(false)
    }
  }

  createEffect(() => {
    const ticker = props.ticker
    if (!ticker) return
    setMessages([])
    setSessionId("")
    sendMessage(`Analyze the stock ${ticker}. Provide a full quote, macro context, and sentiment analysis.`)
  })

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (e) => {
    e.preventDefault()
    const text = input().trim()
    if (!text || streaming()) return
    setInput("")
    sendMessage(text)
  }

  return (
    <div class="flex flex-col h-full">
      <div class="px-3 py-2 border-b border-border flex items-center justify-between">
        <span class="text-text-muted text-xs font-bold tracking-wider">AI ANALYST</span>
        <div class="flex items-center gap-2">
          <div class={`w-1.5 h-1.5 rounded-full ${connected() ? "bg-green" : "bg-text-muted"}`} />
          <span class="text-text-muted text-[10px]">{connected() ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        <For each={messages()}>
          {(msg) => (
            <div class={`${msg.role === "user" ? "ml-8" : "mr-4"}`}>
              <div class={`rounded px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-orange/10 border border-orange/20 text-text"
                  : "bg-element border border-border text-text"
              }`}>
                <div class="text-[10px] font-bold mb-1 text-text-muted uppercase">
                  {msg.role === "user" ? "You" : "Analyst"}
                </div>
                {msg.content || (streaming() ? "Analyzing..." : "")}
              </div>
            </div>
          )}
        </For>
        <Show when={error()}>
          <div class="text-red text-xs bg-red/10 border border-red/20 rounded px-3 py-2">
            {error()}
          </div>
        </Show>
        <div ref={messagesEnd!} />
      </div>

      <form onSubmit={handleSubmit} class="p-3 border-t border-border">
        <div class="flex gap-2">
          <input
            type="text"
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            placeholder={streaming() ? "Waiting for response..." : "Ask the analyst..."}
            disabled={streaming()}
            class="flex-1 bg-element border border-border rounded px-3 py-2 text-xs text-text outline-none focus:border-orange placeholder:text-text-muted disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming() || !input().trim()}
            class="bg-orange text-bg px-4 py-2 rounded text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
          >
            {streaming() ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  )
}
