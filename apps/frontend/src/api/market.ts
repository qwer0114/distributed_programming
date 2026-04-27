import { Market } from "@repo/types";

export async function getMarkets(): Promise<Market[]> {
  const url = "https://api.upbit.com/v1/market/all?isDetails=true";
  const options = {
    method: "GET",
    headers: { accept: "application/json" },
  };
  const response = await fetch(url, options);
  const data = await response.json();
  return data;
}
