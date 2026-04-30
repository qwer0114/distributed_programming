"use client";

import { useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import type { Market } from "@repo/types";
import {
  orderPriceAtom,
  pendingOrdersAtom,
  type PendingOrder,
} from "@/store/atoms";
import type { UpbitTicker } from "@/types/ticker";
import styles from "./OrderForm.module.css";

interface OrderFormProps {
  market: Market;
  ticker: UpbitTicker | null;
  onSubmit: (message: string) => void;
}

type Tab = "buy" | "sell" | "pending";
type OrderType = "limit" | "market";

const MOCK_KRW_BALANCE = 1_000_000;
const MOCK_COIN_BALANCE = 0.5;

function formatPrice(price: number): string {
  if (price >= 100) return price.toLocaleString("ko-KR");
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function formatQty(qty: number): string {
  return qty.toLocaleString("ko-KR", { maximumFractionDigits: 8 });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function OrderForm({ market, ticker, onSubmit }: OrderFormProps) {
  const [tab, setTab] = useState<Tab>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [orderPrice, setOrderPrice] = useAtom(orderPriceAtom);
  const [pendingOrders, setPendingOrders] = useAtom(pendingOrdersAtom);

  const symbol = market.market.split("-")[1];
  const isFormTab = tab === "buy" || tab === "sell";

  useEffect(() => {
    if (orderPrice !== null) {
      setPrice(String(orderPrice));
      setOrderType("limit");
      setOrderPrice(null);
      if (tab === "pending") setTab("buy");
    }
  }, [orderPrice, setOrderPrice, tab]);

  useEffect(() => {
    setPrice("");
    setQuantity("");
  }, [market.market, tab]);

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
    if (tab === "buy") {
      if (effectivePrice <= 0) return;
      const krw = buyableKrw * ratio;
      const qty = krw / effectivePrice;
      setQuantity(qty.toFixed(8));
    } else if (tab === "sell") {
      const qty = sellableCoin * ratio;
      setQuantity(qty.toFixed(8));
    }
  };

  const exceedsBalance = useMemo(() => {
    if (tab === "buy") return total > buyableKrw;
    if (tab === "sell") return numericQty > sellableCoin;
    return false;
  }, [tab, total, numericQty, buyableKrw, sellableCoin]);

  const isInvalid =
    !isFormTab ||
    numericQty <= 0 ||
    exceedsBalance ||
    (orderType === "limit" && numericPrice <= 0);

  const handleSubmit = () => {
    if (isInvalid || !isFormTab) return;
    const order: PendingOrder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      market: market.market,
      korean_name: market.korean_name,
      side: tab,
      type: orderType,
      price: effectivePrice,
      quantity: numericQty,
      total,
      createdAt: Date.now(),
    };
    setPendingOrders((prev) => [order, ...prev]);
    onSubmit("주문이 접수되었습니다");
    setQuantity("");
  };

  const handleCancel = (id: string) => {
    setPendingOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const tabIndex = tab === "buy" ? 0 : tab === "sell" ? 1 : 2;
  const indicatorClass =
    tab === "buy"
      ? styles.indicatorBuy
      : tab === "sell"
        ? styles.indicatorSell
        : styles.indicatorPending;

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "buy" ? styles.tabBuyActive : ""}`}
          onClick={() => setTab("buy")}
        >
          매수
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "sell" ? styles.tabSellActive : ""}`}
          onClick={() => setTab("sell")}
        >
          매도
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "pending" ? styles.tabPendingActive : ""}`}
          onClick={() => setTab("pending")}
        >
          대기
          {pendingOrders.length > 0 && (
            <span className={styles.tabBadge}>{pendingOrders.length}</span>
          )}
        </button>
        <span
          className={`${styles.indicator} ${indicatorClass}`}
          style={{ transform: `translateX(${tabIndex * 100}%)` }}
        />
      </div>

      {isFormTab && (
        <div key={tab} className={styles.body}>
          <div className={styles.balanceRow}>
            <span className={styles.balanceLabel}>
              {tab === "buy" ? "주문가능" : "보유"}
            </span>
            <span className={styles.balanceValue}>
              {tab === "buy"
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
              {tab === "buy" ? "주문가능 금액을 초과했어요" : "보유 수량을 초과했어요"}
            </p>
          )}

          <button
            type="button"
            className={`${styles.submit} ${
              tab === "buy" ? styles.submitBuy : styles.submitSell
            }`}
            disabled={isInvalid}
            onClick={handleSubmit}
          >
            {tab === "buy" ? "매수" : "매도"}
          </button>
        </div>
      )}

      {tab === "pending" && (
        <div key="pending" className={styles.pendingBody}>
          {pendingOrders.length === 0 ? (
            <div className={styles.empty}>대기 중인 주문이 없어요</div>
          ) : (
            <ul className={styles.pendingList}>
              {pendingOrders.map((o) => {
                const sideCls =
                  o.side === "buy" ? styles.pendingBuy : styles.pendingSell;
                return (
                  <li key={o.id} className={styles.pendingItem}>
                    <div className={styles.pendingHead}>
                      <span className={`${styles.pendingSide} ${sideCls}`}>
                        {o.side === "buy" ? "매수" : "매도"}
                      </span>
                      <span className={styles.pendingMarket}>
                        {o.korean_name}
                        <span className={styles.pendingMarketCode}>
                          {o.market}
                        </span>
                      </span>
                      <span className={styles.pendingTime}>
                        {formatTime(o.createdAt)}
                      </span>
                    </div>
                    <div className={styles.pendingMeta}>
                      <span className={styles.pendingType}>
                        {o.type === "limit" ? "지정가" : "시장가"}
                      </span>
                      <span className={styles.pendingStatus}>대기</span>
                    </div>
                    <dl className={styles.pendingGrid}>
                      <dt>가격</dt>
                      <dd>
                        {formatPrice(o.price)}{" "}
                        <span className={styles.pendingUnit}>KRW</span>
                      </dd>
                      <dt>수량</dt>
                      <dd>
                        {formatQty(o.quantity)}{" "}
                        <span className={styles.pendingUnit}>
                          {o.market.split("-")[1]}
                        </span>
                      </dd>
                      <dt>총액</dt>
                      <dd>
                        {formatPrice(Math.floor(o.total))}{" "}
                        <span className={styles.pendingUnit}>KRW</span>
                      </dd>
                    </dl>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => handleCancel(o.id)}
                    >
                      취소
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
