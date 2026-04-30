"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Market } from "@repo/types";
import { useUpbitSocket } from "@/hooks/useUpbitSocket";
import type { UpbitTicker } from "@/types/ticker";
import CoinHeader from "./CoinHeader";
import Chart from "./Chart";
import OrderBook from "./OrderBook";
import OrderForm from "./OrderForm";
import Toast, { type ToastItem } from "./Toast";
import styles from "./TradeView.module.css";

interface TradeViewProps {
  market: Market;
}

export default function TradeView({ market }: TradeViewProps) {
  const [ticker, setTicker] = useState<UpbitTicker | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const handleTicker = useCallback((data: UpbitTicker) => {
    setTicker(data);
  }, []);

  useUpbitSocket<UpbitTicker>({
    type: "ticker",
    codes: [market.market],
    onMessage: handleTicker,
    isOnlyRealtime: false,
  });

  const showToast = useCallback((message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    setTicker(null);
  }, [market.market]);

  return (
    <div className={styles.wrapper}>
      <CoinHeader market={market} ticker={ticker} />
      <div className={styles.layout}>
        <div className={styles.left}>
          <Chart market={market.market} />
        </div>
        <div className={styles.right}>
          <OrderBook market={market.market} />
          <OrderForm market={market} ticker={ticker} onSubmit={showToast} />
        </div>
      </div>
      <Toast items={toasts} onRemove={removeToast} />
    </div>
  );
}
