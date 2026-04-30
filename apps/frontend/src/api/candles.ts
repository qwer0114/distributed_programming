import type { ChartUnit, UpbitCandle } from "@/types/candle";

const BASE_URL = "https://api.upbit.com/v1";

function endpointForUnit(unit: ChartUnit): string {
  switch (unit) {
    case "1m":
      return "/candles/minutes/1";
    case "3m":
      return "/candles/minutes/3";
    case "5m":
      return "/candles/minutes/5";
    case "10m":
      return "/candles/minutes/10";
    case "15m":
      return "/candles/minutes/15";
    case "30m":
      return "/candles/minutes/30";
    case "60m":
      return "/candles/minutes/60";
    case "day":
      return "/candles/days";
    case "week":
      return "/candles/weeks";
    case "month":
      return "/candles/months";
    case "year":
      return "/candles/years";
  }
}

export async function getCandles(
  market: string,
  unit: ChartUnit,
  count = 200,
): Promise<UpbitCandle[]> {
  const path = endpointForUnit(unit);
  const url = `${BASE_URL}${path}?market=${encodeURIComponent(market)}&count=${count}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch candles: ${res.status}`);
  }
  return res.json();
}
