import { atom } from "jotai";
import type { SocketStatus } from "@/hooks/useUpbitSocket";
import type { ChartUnit } from "@/types/candle";

export const searchQueryAtom = atom("");
export const wsStatusAtom = atom<SocketStatus>("connecting");

export const chartUnitAtom = atom<ChartUnit>("60m");

export const orderPriceAtom = atom<number | null>(null);
