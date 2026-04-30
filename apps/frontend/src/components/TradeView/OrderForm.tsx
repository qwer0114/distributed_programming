"use client";

import { useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import type { Market } from "@repo/types";
import { orderPriceAtom } from "@/store/atoms";
import type { UpbitTicker } from "@/types/ticker";
import styles from "./OrderForm.module.css";

interface OrderFormProps {
  market: Market;
  ticker: UpbitTicker | null;
  onSubmit: (message: string) => void;
}

type Side = "buy" | "sell";
type OrderType = "limit" | "market";

const MOCK_KRW_BALANCE = 1_000_000;
const MOCK_COIN_BALANCE = 0.5;

function formatPrice(price: number): string {
  if (price >= 100) return price.toLocaleString("ko-KR");
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export default function OrderForm({ market, ticker, onSubmit }: OrderFormProps) {
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [orderPrice, setOrderPrice] = useAtom(orderPriceAtom);

  const symbol = market.market.split("-")[1];

  useEffect(() => {
    if (orderPrice !== null) {
      setPrice(String(orderPrice));
      setOrderType("limit");
      setOrderPrice(null);
    }
  }, [orderPrice, setOrderPrice]);

  useEffect(() => {
    setPrice("");
    setQuantity("");
  }, [market.market, side]);

  const numericPrice = parseFloat(price) || 0;
  const numericQty = parseFloat(quantity) || 0;
  const effectivePrice =
    orderType === "market"
      ? ticker?.trade_price ?? 0
      : numericPrice;

  const total = effectivePrice * numericQty;

  const buyableKrw = MOCK_KRW_BALANCE;
  const sellableCoin = MOCK_COIN_BALANCE;

  const handleRatio = (ratio: number) => {
    if (side === "buy") {
      if (effectivePrice <= 0) return;
      const krw = buyableKrw * ratio;
      const qty = krw / effectivePrice;
      setQuantity(qty.toFixed(8));
    } else {
      const qty = sellableCoin * ratio;
      setQuantity(qty.toFixed(8));
    }
  };

  const exceedsBalance = useMemo(() => {
    if (side === "buy") {
      return total > buyableKrw;
    }
    return numericQty > sellableCoin;
  }, [side, total, numericQty, buyableKrw, sellableCoin]);

  const isInvalid =
    numericQty <= 0 ||
    exceedsBalance ||
    (orderType === "limit" && numericPrice <= 0);

  const handleSubmit = () => {
    if (isInvalid) return;
    onSubmit("주문이 접수되었습니다");
    setQuantity("");
  };

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${side === "buy" ? styles.tabBuyActive : ""}`}
          onClick={() => setSide("buy")}
        >
          매수
        </button>
        <button
          type="button"
          className={`${styles.tab} ${side === "sell" ? styles.tabSellActive : ""}`}
          onClick={() => setSide("sell")}
        >
          매도
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.balanceRow}>
          <span className={styles.balanceLabel}>
            {side === "buy" ? "주문가능" : "보유"}
          </span>
          <span className={styles.balanceValue}>
            {side === "buy"
              ? `${buyableKrw.toLocaleString("ko-KR")} KRW`
              : `${sellableCoin.toLocaleString("ko-KR", { maximumFractionDigits: 8 })} ${symbol}`}
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>주문 유형</label>
          <div className={styles.typeToggle}>
            <button
              type="button"
              className={`${styles.typeBtn} ${orderType === "limit" ? styles.typeActive : ""}`}
              onClick={() => setOrderType("limit")}
            >
              지정가
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${orderType === "market" ? styles.typeActive : ""}`}
              onClick={() => setOrderType("market")}
            >
              시장가
            </button>
          </div>
        </div>

        {orderType === "limit" && (
          <div className={styles.field}>
            <label className={styles.label}>가격</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                inputMode="decimal"
                className={styles.input}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
              <span className={styles.unit}>KRW</span>
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>수량</label>
          <div className={styles.inputWrap}>
            <input
              type="number"
              inputMode="decimal"
              className={styles.input}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
            <span className={styles.unit}>{symbol}</span>
          </div>
          <div className={styles.ratios}>
            {[0.25, 0.5, 0.75, 1].map((r) => (
              <button
                key={r}
                type="button"
                className={styles.ratioBtn}
                onClick={() => handleRatio(r)}
              >
                {r * 100}%
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>총액</label>
          <div className={styles.inputWrap}>
            <input
              type="text"
              readOnly
              className={`${styles.input} ${styles.readonly}`}
              value={total > 0 ? formatPrice(Math.floor(total)) : ""}
              placeholder="0"
            />
            <span className={styles.unit}>KRW</span>
          </div>
        </div>

        {exceedsBalance && (
          <p className={styles.warn}>
            {side === "buy" ? "주문가능 금액을 초과했어요" : "보유 수량을 초과했어요"}
          </p>
        )}

        <button
          type="button"
          className={`${styles.submit} ${
            side === "buy" ? styles.submitBuy : styles.submitSell
          }`}
          disabled={isInvalid}
          onClick={handleSubmit}
        >
          {side === "buy" ? "매수" : "매도"}
        </button>
      </div>
    </div>
  );
}
