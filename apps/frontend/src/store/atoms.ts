import { atom } from "jotai";
import type { SocketStatus } from "@/hooks/useUpbitSocket";

export const searchQueryAtom = atom("");
export const wsStatusAtom = atom<SocketStatus>("connecting");
