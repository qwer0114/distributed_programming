"use client";

import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { useQuery } from "@tanstack/react-query";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from "lightweight-charts";
import { getCandles } from "@/api/candles";
import { CHART_UNITS, type ChartUnit, type UpbitCandle } from "@/types/candle";
import { chartUnitAtom } from "@/store/atoms";
import styles from "./Chart.module.css";

interface ChartProps {
  market: string;
}

const RISE = "#ef5350";
const FALL = "#1976d2";

function toTime(kst: string): UTCTimestamp {
  return Math.floor(new Date(kst + "+09:00").getTime() / 1000) as UTCTimestamp;
}

function mapCandle(c: UpbitCandle): CandlestickData {
  return {
    time: toTime(c.candle_date_time_kst),
    open: c.opening_price,
    high: c.high_price,
    low: c.low_price,
    close: c.trade_price,
  };
}

function mapVolume(c: UpbitCandle): HistogramData {
  const isUp = c.trade_price >= c.opening_price;
  return {
    time: toTime(c.candle_date_time_kst),
    value: c.candle_acc_trade_volume,
    color: isUp ? "rgba(239, 83, 80, 0.5)" : "rgba(25, 118, 210, 0.5)",
  };
}

export default function Chart({ market }: ChartProps) {
  const [unit, setUnit] = useAtom(chartUnitAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["candles", market, unit],
    queryFn: () => getCandles(market, unit, 200),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#1b1c24" },
        textColor: "rgba(232, 236, 242, 0.65)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.07)",
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.07)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: RISE,
      downColor: FALL,
      borderUpColor: RISE,
      borderDownColor: FALL,
      wickUpColor: RISE,
      wickDownColor: FALL,
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!data || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    candleSeriesRef.current.setData(sorted.map(mapCandle));
    volumeSeriesRef.current.setData(sorted.map(mapVolume));
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        {CHART_UNITS.map((u) => (
          <button
            key={u.value}
            type="button"
            className={`${styles.tab} ${unit === u.value ? styles.tabActive : ""}`}
            onClick={() => setUnit(u.value as ChartUnit)}
          >
            {u.label}
          </button>
        ))}
      </div>
      <div className={styles.chartArea}>
        {isLoading && (
          <div className={styles.skeleton}>
            <div className={styles.skeletonBar} />
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.skeletonCandle}
                  style={{ height: `${30 + ((i * 17) % 50)}%` }}
                />
              ))}
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className={styles.chart}
          style={{ visibility: isLoading ? "hidden" : "visible" }}
        />
      </div>
    </div>
  );
}
