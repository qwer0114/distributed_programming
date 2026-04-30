import type { UpbitOrderbook } from "@/types/orderbook";

const BASE_URL = "https://api.upbit.com/v1";

export async function getOrderbook(market: string): Promise<UpbitOrderbook> {
  const url = `${BASE_URL}/orderbook?markets=${encodeURIComponent(market)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch orderbook: ${res.status}`);
  }
  const data: UpbitOrderbook[] = await res.json();
  return data[0];
}
