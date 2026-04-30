import type { UpbitTicker } from "@/types/ticker";

const BASE_URL = "https://api.upbit.com/v1";

export interface UpbitTickerSnapshot {
  market: string;
  trade_price: number;
  opening_price: number;
  high_price: number;
  low_price: number;
  prev_closing_price: number;
  change: UpbitTicker["change"];
  change_price: number;
  change_rate: number;
  signed_change_price: number;
  signed_change_rate: number;
  acc_trade_price_24h: number;
  acc_trade_volume_24h: number;
}

export async function getTicker(market: string): Promise<UpbitTickerSnapshot> {
  const url = `${BASE_URL}/ticker?markets=${encodeURIComponent(market)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ticker: ${res.status}`);
  }
  const data: UpbitTickerSnapshot[] = await res.json();
  return data[0];
}
