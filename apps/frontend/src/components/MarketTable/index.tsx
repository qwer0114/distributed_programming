"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
} from "react";
import type { Market } from "@repo/types";
import { useUpbitSocket, type SocketStatus } from "@/hooks/useUpbitSocket";
import type { UpbitTicker } from "@/types/ticker";
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

function formatTradeVolume(price: number): string {
  const eok = price / 100_000_000;
  return eok.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

function formatChangeRate(rate: number): string {
  const sign = rate > 0 ? "+" : "";
  return `${sign}${(rate * 100).toFixed(2)}%`;
}

function formatChangePrice(price: number): string {
  const sign = price > 0 ? "+" : "";
  return `${sign}${formatPrice(Math.abs(price))}`;
}

export default function MarketTable({ markets }: MarketTableProps) {
  const tickerMapRef = useRef<Map<string, UpbitTicker>>(new Map());
  const [tickerMap, setTickerMap] = useState<Map<string, UpbitTicker>>(
    new Map(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    column: SortColumn;
    direction: SortDirection;
  }>({ column: "acc_trade_price_24h", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [wsStatus, setWsStatus] = useState<SocketStatus>("connecting");
  const [, startTransition] = useTransition();

  const marketCodes = useMemo(() => markets.map((m) => m.market), [markets]);

  const handleMessage = useCallback((data: UpbitTicker) => {
    tickerMapRef.current.set(data.code, data);
  }, []);

  // 200ms마다 ref → state 동기화 (WebSocket 메시지마다 리렌더 방지)
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

  const mergedData = useMemo<MergedMarket[]>(() => {
    return markets.map((market) => ({
      ...market,
      ticker: tickerMap.get(market.market) ?? null,
    }));
  }, [markets, tickerMap]);

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
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortConfig.column) {
        case "korean_name":
          aVal = a.korean_name;
          bVal = b.korean_name;
          break;
        case "trade_price":
          aVal = a.ticker?.trade_price ?? -1;
          bVal = b.ticker?.trade_price ?? -1;
          break;
        case "signed_change_rate":
          aVal = a.ticker?.signed_change_rate ?? 0;
          bVal = b.ticker?.signed_change_rate ?? 0;
          break;
        case "signed_change_price":
          aVal = a.ticker?.signed_change_price ?? 0;
          bVal = b.ticker?.signed_change_price ?? 0;
          break;
        case "acc_trade_price_24h":
          aVal = a.ticker?.acc_trade_price_24h ?? -1;
          bVal = b.ticker?.acc_trade_price_24h ?? -1;
          break;
      }

      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal as string, "ko");
        return sortConfig.direction === "asc" ? cmp : -cmp;
      }

      const diff = (aVal as number) - (bVal as number);
      return sortConfig.direction === "asc" ? diff : -diff;
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

  const getSortIcon = (column: SortColumn) => {
    if (sortConfig.column !== column)
      return <span className={styles.sortIcon}>↕</span>;
    return (
      <span className={`${styles.sortIcon} ${styles.sortActive}`}>
        {sortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>암호화폐 시세</h1>
        <div className={styles.controls}>
          <div
            className={`${styles.wsStatus} ${wsStatus === "connected" ? styles.connected : styles.connecting}`}
          >
            <span className={styles.statusDot} />
            {wsStatus === "connected" ? "실시간" : "연결중..."}
          </div>
          <input
            type="search"
            placeholder="코인명 또는 심볼 검색"
            value={searchQuery}
            onChange={handleSearch}
            className={styles.searchInput}
          />
        </div>
      </div>

      {isSearching && (
        <p className={styles.searchResult}>
          검색 결과: <strong>{sortedData.length}</strong>개
        </p>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colName}`}
                onClick={() => handleSort("korean_name")}
              >
                코인명 / 심볼 {getSortIcon("korean_name")}
              </th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colRight}`}
                onClick={() => handleSort("trade_price")}
              >
                현재가 {getSortIcon("trade_price")}
              </th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colRight}`}
                onClick={() => handleSort("signed_change_rate")}
              >
                전일대비(%) {getSortIcon("signed_change_rate")}
              </th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colRight}`}
                onClick={() => handleSort("signed_change_price")}
              >
                등락액 {getSortIcon("signed_change_price")}
              </th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.colRight}`}
                onClick={() => handleSort("acc_trade_price_24h")}
              >
                거래대금(24h) {getSortIcon("acc_trade_price_24h")}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((market) => {
              const ticker = market.ticker;
              const changeClass =
                ticker && ticker.signed_change_rate > 0
                  ? styles.rise
                  : ticker && ticker.signed_change_rate < 0
                    ? styles.fall
                    : "";

              return (
                <tr key={market.market} className={styles.row}>
                  <td className={`${styles.td} ${styles.colName}`}>
                    <div className={styles.marketInfo}>
                      <span className={styles.koreanName}>
                        {market.korean_name}
                      </span>
                      <span className={styles.symbol}>{market.market}</span>
                    </div>
                    {market.market_warning === "CAUTION" && (
                      <span className={styles.warningBadge}>유의</span>
                    )}
                  </td>
                  <td className={`${styles.td} ${styles.colRight} ${changeClass}`}>
                    {ticker ? formatPrice(ticker.trade_price) : "—"}
                  </td>
                  <td className={`${styles.td} ${styles.colRight} ${changeClass}`}>
                    {ticker ? formatChangeRate(ticker.signed_change_rate) : "—"}
                  </td>
                  <td className={`${styles.td} ${styles.colRight} ${changeClass}`}>
                    {ticker
                      ? formatChangePrice(ticker.signed_change_price)
                      : "—"}
                  </td>
                  <td className={`${styles.td} ${styles.colRight}`}>
                    {ticker
                      ? `${formatTradeVolume(ticker.acc_trade_price_24h)}억`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isSearching && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            «
          </button>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          <span className={styles.pageInfo}>
            {currentPage} / {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages, p + 1))
            }
            disabled={currentPage === totalPages}
          >
            ›
          </button>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
