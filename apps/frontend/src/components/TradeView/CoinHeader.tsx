"use client";

import { useQuery } from "@tanstack/react-query";
import type { Market } from "@repo/types";
import { getTicker } from "@/api/ticker";
import type { UpbitTicker } from "@/types/ticker";
import styles from "./CoinHeader.module.css";

interface CoinHeaderProps {
  market: Market;
  ticker: UpbitTicker | null;
}

function formatPrice(price: number): string {
  if (price >= 100) return price.toLocaleString("ko-KR");
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(8);
}

export default function CoinHeader({ market, ticker }: CoinHeaderProps) {
  const { data: snapshot } = useQuery({
    queryKey: ["ticker", market.market],
    queryFn: () => getTicker(market.market),
    enabled: !ticker,
  });

  const price = ticker?.trade_price ?? snapshot?.trade_price;
  const rate = ticker?.signed_change_rate ?? snapshot?.signed_change_rate;
  const change = ticker?.signed_change_price ?? snapshot?.signed_change_price;

  const cls =
    rate !== undefined && rate > 0
      ? styles.rise
      : rate !== undefined && rate < 0
        ? styles.fall
        : "";

  const symbol = market.market.split("-")[1];

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <img
          alt={symbol}
          src={`https://static.upbit.com/logos/${symbol}.png`}
          width={32}
          height={32}
          className={styles.icon}
        />
        <div className={styles.info}>
          <div className={styles.name}>
            {market.korean_name}
            <span className={styles.code}>{market.market}</span>
          </div>
        </div>
      </div>
      <div className={styles.right}>
        <div className={`${styles.price} ${cls}`}>
          {price !== undefined ? formatPrice(price) : "—"}
          <span className={styles.unit}>KRW</span>
        </div>
        <div className={`${styles.change} ${cls}`}>
          {rate !== undefined ? (
            <>
              <span>
                {rate > 0 ? "+" : ""}
                {(rate * 100).toFixed(2)}%
              </span>
              <span className={styles.changeAmt}>
                {change !== undefined
                  ? `${change > 0 ? "+" : ""}${formatPrice(Math.abs(change))}`
                  : ""}
              </span>
            </>
          ) : (
            <span className={styles.empty}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}
