import { atom } from "jotai";
import type { SocketStatus } from "@/hooks/useUpbitSocket";
import type { ChartUnit } from "@/types/candle";

export const searchQueryAtom = atom("");
export const wsStatusAtom = atom<SocketStatus>("connecting");

export const chartUnitAtom = atom<ChartUnit>("60m");

export const orderPriceAtom = atom<number | null>(null);

export type OrderSide = "buy" | "sell";
export type OrderTypeKind = "limit" | "market";

export interface PendingOrder {
  id: string;
  market: string;
  korean_name: string;
  side: OrderSide;
  type: OrderTypeKind;
  price: number;
  quantity: number;
  total: number;
  createdAt: number;
}

export const pendingOrdersAtom = atom<PendingOrder[]>([]);
