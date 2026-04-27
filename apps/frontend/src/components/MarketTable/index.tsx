"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
} from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { Market } from "@repo/types";
import { useUpbitSocket } from "@/hooks/useUpbitSocket";
import type { UpbitTicker } from "@/types/ticker";
import { searchQueryAtom, wsStatusAtom } from "@/store/atoms";
import styles from "./MarketTable.module.css";

type SortColumn =
  | "korean_name"
  | "trade_price"
  | "signed_change_rate"
  | "signed_change_price"
  | "acc_trade_price_24h";
type SortDirection = "asc" | "desc";

interface MergedMarket extends Market {
  ticker: UpbitTicker | null;
}

interface MarketTableProps {
  markets: Market[];
}

const PAGE_SIZE = 50;

function formatPrice(price: number): string {
  if (price >= 100) return price.toLocaleString("ko-KR");
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(8);
}

function formatVolume(price: number): string {
  const eok = price / 100_000_000;
  return eok.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

function formatRate(rate: number): string {
  const sign = rate > 0 ? "+" : "";
  return `${sign}${(rate * 100).toFixed(2)}%`;
}

function formatChangePrice(price: number): string {
  const sign = price > 0 ? "+" : price < 0 ? "" : "";
  return `${sign}${formatPrice(Math.abs(price))}`;
}

function SortIcon({ column, sortConfig }: {
  column: SortColumn;
  sortConfig: { column: SortColumn; direction: SortDirection };
}) {
  if (sortConfig.column !== column) {
    return (
      <svg className={styles.sortIconInactive} width="10" height="10" viewBox="0 0 10 14" fill="none">
        <path d="M5 1L1 5h8L5 1z" fill="currentColor" opacity="0.3" />
        <path d="M5 13L9 9H1l4 4z" fill="currentColor" opacity="0.3" />
      </svg>
    );
  }
  return (
    <svg className={styles.sortIconActive} width="10" height="10" viewBox="0 0 10 14" fill="none">
      {sortConfig.direction === "asc" ? (
        <path d="M5 1L1 6h8L5 1z" fill="currentColor" />
      ) : (
        <path d="M5 13L9 8H1l4 5z" fill="currentColor" />
      )}
    </svg>
  );
}

export default function MarketTable({ markets }: MarketTableProps) {
  const tickerMapRef = useRef<Map<string, UpbitTicker>>(new Map());
  const [tickerMap, setTickerMap] = useState<Map<string, UpbitTicker>>(new Map());
  const searchQuery = useAtomValue(searchQueryAtom);
  const setWsStatus = useSetAtom(wsStatusAtom);
  const [sortConfig, setSortConfig] = useState<{
    column: SortColumn;
    direction: SortDirection;
  }>({ column: "acc_trade_price_24h", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [, startTransition] = useTransition();

  const marketCodes = useMemo(() => markets.map((m) => m.market), [markets]);

  const handleMessage = useCallback((data: UpbitTicker) => {
    tickerMapRef.current.set(data.code, data);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => {
        setTickerMap(new Map(tickerMapRef.current));
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useUpbitSocket<UpbitTicker>({
    type: "ticker",
    codes: marketCodes,
    onMessage: handleMessage,
    onStatusChange: setWsStatus,
    isOnlyRealtime: false,
  });

  const mergedData = useMemo<MergedMarket[]>(
    () => markets.map((m) => ({ ...m, ticker: tickerMap.get(m.market) ?? null })),
    [markets, tickerMap],
  );

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return mergedData;
    const q = searchQuery.toLowerCase();
    return mergedData.filter(
      (m) =>
        m.korean_name.toLowerCase().includes(q) ||
        m.market.toLowerCase().includes(q),
    );
  }, [mergedData, searchQuery]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortConfig.column) {
        case "korean_name":
          av = a.korean_name;
          bv = b.korean_name;
          break;
        case "trade_price":
          av = a.ticker?.trade_price ?? -1;
          bv = b.ticker?.trade_price ?? -1;
          break;
        case "signed_change_rate":
          av = a.ticker?.signed_change_rate ?? 0;
          bv = b.ticker?.signed_change_rate ?? 0;
          break;
        case "signed_change_price":
          av = a.ticker?.signed_change_price ?? 0;
          bv = b.ticker?.signed_change_price ?? 0;
          break;
        case "acc_trade_price_24h":
          av = a.ticker?.acc_trade_price_24h ?? -1;
          bv = b.ticker?.acc_trade_price_24h ?? -1;
          break;
      }
      if (typeof av === "string") {
        const c = av.localeCompare(bv as string, "ko");
        return sortConfig.direction === "asc" ? c : -c;
      }
      const d = (av as number) - (bv as number);
      return sortConfig.direction === "asc" ? d : -d;
    });
  }, [filteredData, sortConfig]);

  const isSearching = searchQuery.trim().length > 0;
  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const displayData = isSearching
    ? sortedData
    : sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "desc" },
    );
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className={styles.container}>
      {/* Search result count */}
      {isSearching && (
        <p className={styles.searchResult}>
          <span className={styles.searchResultCount}>{sortedData.length}</span>개 검색됨
        </p>
      )}

      {/* Table */}
      <div className={styles.tablePanel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colName}`}
                onClick={() => handleSort("korean_name")}
              >
                <span>코인명</span>
                <SortIcon column="korean_name" sortConfig={sortConfig} />
              </th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colNum}`}
                onClick={() => handleSort("trade_price")}
              >
                <span>현재가</span>
                <SortIcon column="trade_price" sortConfig={sortConfig} />
              </th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colNum}`}
                onClick={() => handleSort("signed_change_rate")}
              >
                <span>전일대비</span>
                <SortIcon column="signed_change_rate" sortConfig={sortConfig} />
              </th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colNum}`}
                onClick={() => handleSort("signed_change_price")}
              >
                <span>등락액</span>
                <SortIcon column="signed_change_price" sortConfig={sortConfig} />
              </th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colNum}`}
                onClick={() => handleSort("acc_trade_price_24h")}
              >
                <span>거래대금(24h)</span>
                <SortIcon column="acc_trade_price_24h" sortConfig={sortConfig} />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((m) => {
              const t = m.ticker;
              const changeClass =
                t && t.signed_change_rate > 0
                  ? styles.rise
                  : t && t.signed_change_rate < 0
                    ? styles.fall
                    : "";
              return (
                <tr key={m.market} className={styles.row}>
                  <td className={`${styles.td} ${styles.colName}`}>
                    <div className={styles.coinInfo}>
                      <span className={styles.coinName}>{m.korean_name}</span>
                      <span className={styles.coinSymbol}>{m.market}</span>
                    </div>
                    {m.market_warning === "CAUTION" && (
                      <span className={styles.badge}>유의</span>
                    )}
                  </td>
                  <td className={`${styles.td} ${styles.colNum} ${changeClass}`}>
                    {t ? formatPrice(t.trade_price) : <span className={styles.empty}>—</span>}
                  </td>
                  <td className={`${styles.td} ${styles.colNum} ${changeClass}`}>
                    {t ? (
                      <div className={`${styles.rateCell} ${changeClass}`}>
                        {formatRate(t.signed_change_rate)}
                      </div>
                    ) : (
                      <span className={styles.empty}>—</span>
                    )}
                  </td>
                  <td className={`${styles.td} ${styles.colNum} ${changeClass}`}>
                    {t ? formatChangePrice(t.signed_change_price) : <span className={styles.empty}>—</span>}
                  </td>
                  <td className={`${styles.td} ${styles.colNum}`}>
                    {t ? (
                      <span className={styles.volume}>{formatVolume(t.acc_trade_price_24h)}<span className={styles.volumeUnit}>억</span></span>
                    ) : (
                      <span className={styles.empty}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isSearching && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >«</button>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >‹</button>
          <span className={styles.pageInfo}>{currentPage} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >›</button>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >»</button>
        </div>
      )}
    </div>
  );
}
