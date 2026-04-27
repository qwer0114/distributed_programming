"use client";

import { useAtom, useAtomValue } from "jotai";
import { searchQueryAtom, wsStatusAtom } from "@/store/atoms";
import styles from "./Header.module.css";

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

export default function Header() {
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const wsStatus = useAtomValue(wsStatusAtom);

  return (
    <header className={styles.header}>
      {/* Left: page context */}
      <div className={styles.left}>
        <span className={styles.pageTitle}>코인</span>
        <span className={styles.pageSub}>전체</span>
      </div>

      {/* Center: search */}
      <div className={styles.center}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            <IconSearch />
          </span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="코인명 또는 심볼 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              className={styles.clearBtn}
              onClick={() => setSearchQuery("")}
              aria-label="검색어 지우기"
            >
              <IconClose />
            </button>
          )}
        </div>
      </div>

      {/* Right: status + actions */}
      <div className={styles.right}>
        <div
          className={`${styles.wsStatus} ${wsStatus === "connected" ? styles.connected : styles.connecting}`}
        >
          <span className={styles.dot} />
          <span className={styles.statusLabel}>
            {wsStatus === "connected" ? "실시간" : "연결중"}
          </span>
        </div>

        <button className={styles.iconBtn} aria-label="알림">
          <IconBell />
        </button>

        <div className={styles.avatar}>U</div>
      </div>
    </header>
  );
}
