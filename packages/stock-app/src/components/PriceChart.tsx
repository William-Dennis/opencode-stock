import { createSignal, createEffect, onCleanup, onMount, Show } from "solid-js"
import { createChart, type IChartApi, type ISeriesApi, ColorType, type CandlestickData, type HistogramData, type Time } from "lightweight-charts"
import { fetchChartData, type Bar } from "@/api/alpaca"

const PERIODS = ["1D", "5D", "1M", "3M", "1Y"] as const

function barToCandle(bar: Bar): CandlestickData<Time> {
  return {
    time: (bar.t.split("T")[0] || bar.t.slice(0, 10)) as unknown as Time,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
  }
}

function barToVolume(bar: Bar, prev?: Bar): HistogramData<Time> {
  return {
    time: (bar.t.split("T")[0] || bar.t.slice(0, 10)) as unknown as Time,
    value: bar.v,
    color: bar.c >= (prev?.c ?? bar.o) ? "rgba(51, 204, 51, 0.4)" : "rgba(255, 68, 68, 0.4)",
  }
}

export function PriceChart(props: { ticker: string }) {
  let chartContainer!: HTMLDivElement
  let chart: IChartApi | undefined
  let candleSeries: ISeriesApi<"Candlestick"> | undefined
  let volumeSeries: ISeriesApi<"Histogram"> | undefined

  const [period, setPeriod] = createSignal<(typeof PERIODS)[number]>("1M")
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")

  onMount(() => {
    chart = createChart(chartContainer, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0e14" },
        textColor: "#6b7a8d",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e2a3a" },
        horzLines: { color: "#1e2a3a" },
      },
      crosshair: {
        vertLine: { color: "#ff8c00", labelBackgroundColor: "#ff8c00" },
        horzLine: { color: "#ff8c00", labelBackgroundColor: "#ff8c00" },
      },
      rightPriceScale: {
        borderColor: "#1e2a3a",
      },
      timeScale: {
        borderColor: "#1e2a3a",
        timeVisible: true,
      },
    })

    candleSeries = chart.addCandlestickSeries({
      upColor: "#33cc33",
      downColor: "#ff4444",
      borderUpColor: "#33cc33",
      borderDownColor: "#ff4444",
      wickUpColor: "#33cc33",
      wickDownColor: "#ff4444",
    })

    volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    })

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    const observer = new ResizeObserver(() => {
      chart?.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
      })
    })
    observer.observe(chartContainer)
    onCleanup(() => observer.disconnect())
  })

  createEffect(async () => {
    const ticker = props.ticker
    const p = period()
    if (!ticker || !candleSeries || !volumeSeries) return

    setLoading(true)
    setError("")
    try {
      const bars = await fetchChartData(ticker, p)
      if (bars.length === 0) {
        setError("No data available")
        return
      }

      const candles = bars.map(barToCandle)
      const volumes = bars.map((bar, i) => barToVolume(bar, bars[i - 1]))

      candleSeries.setData(candles)
      volumeSeries.setData(volumes)
      chart?.timeScale().fitContent()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chart data")
    } finally {
      setLoading(false)
    }
  })

  onCleanup(() => {
    chart?.remove()
  })

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-1 px-3 py-2 border-b border-border">
        {PERIODS.map((p) => (
          <button
            class={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
              period() === p
                ? "bg-orange text-bg"
                : "text-text-muted hover:text-orange"
            }`}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
        <Show when={loading()}>
          <span class="text-text-muted text-xs ml-2 animate-pulse">Loading...</span>
        </Show>
        <Show when={error()}>
          <span class="text-red text-xs ml-2">{error()}</span>
        </Show>
      </div>
      <div ref={chartContainer!} class="flex-1 min-h-0" />
    </div>
  )
}
