"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { getOrderbook } from "@/api/orderbook";
import { orderPriceAtom } from "@/store/atoms";
import styles from "./OrderBook.module.css";

interface OrderBookProps {
  market: string;
}

const ROW_COUNT = 10;

function formatPrice(price: number): string {
  if (price >= 100) return price.toLocaleString("ko-KR");
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function formatSize(size: number): string {
  return size.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}

export default function OrderBook({ market }: OrderBookProps) {
  const setOrderPrice = useSetAtom(orderPriceAtom);

  const { data, isLoading } = useQuery({
    queryKey: ["orderbook", market],
    queryFn: () => getOrderbook(market),
    refetchInterval: 1000,
  });

  const { asks, bids, maxAsk, maxBid } = useMemo(() => {
    if (!data) return { asks: [], bids: [], maxAsk: 0, maxBid: 0 };
    const units = data.orderbook_units.slice(0, ROW_COUNT);
    const asks = units
      .map((u) => ({ price: u.ask_price, size: u.ask_size }))
      .sort((a, b) => b.price - a.price);
    const bids = units.map((u) => ({ price: u.bid_price, size: u.bid_size }));
    const maxAsk = Math.max(...asks.map((a) => a.size), 0);
    const maxBid = Math.max(...bids.map((b) => b.size), 0);
    return { asks, bids, maxAsk, maxBid };
  }, [data]);

  const currentPrice = data?.orderbook_units[0]?.bid_price;

  return (
    <div className={styles.panel}>
      <div className={styles.title}>호가</div>
      <div className={styles.headRow}>
        <span className={styles.headSize}>잔량</span>
        <span className={styles.headPrice}>가격(KRW)</span>
        <span className={styles.headBar} />
      </div>

      {isLoading && (
        <div className={styles.loading}>로딩중...</div>
      )}

      <div className={styles.askList}>
        {asks.map((a) => (
          <button
            key={`ask-${a.price}`}
            type="button"
            className={`${styles.row} ${styles.ask}`}
            onClick={() => setOrderPrice(a.price)}
          >
            <span className={styles.size}>{formatSize(a.size)}</span>
            <span className={styles.price}>{formatPrice(a.price)}</span>
            <span className={styles.barWrap}>
              <span
                className={`${styles.bar} ${styles.askBar}`}
                style={{ width: `${maxAsk ? (a.size / maxAsk) * 100 : 0}%` }}
              />
            </span>
          </button>
        ))}
      </div>

      {currentPrice !== undefined && (
        <div className={styles.divider}>
          <span>현재가</span>
          <span className={styles.dividerPrice}>{formatPrice(currentPrice)}</span>
        </div>
      )}

      <div className={styles.bidList}>
        {bids.map((b) => (
          <button
            key={`bid-${b.price}`}
            type="button"
            className={`${styles.row} ${styles.bid}`}
            onClick={() => setOrderPrice(b.price)}
          >
            <span className={styles.size}>{formatSize(b.size)}</span>
            <span className={styles.price}>{formatPrice(b.price)}</span>
            <span className={styles.barWrap}>
              <span
                className={`${styles.bar} ${styles.bidBar}`}
                style={{ width: `${maxBid ? (b.size / maxBid) * 100 : 0}%` }}
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
