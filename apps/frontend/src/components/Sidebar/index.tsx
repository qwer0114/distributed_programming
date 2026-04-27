"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

function IconHome() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20a1 1 0 001 1h4M19 10V20a1 1 0 01-1 1h-4M9 21V15a1 1 0 011-1h4a1 1 0 011 1v6" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconCoin() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 8.5h3.25a2 2 0 010 4H9.5m0 0h3.75a2 2 0 010 4H9.5M9.5 8.5V16M11 7v1.5M11 15.5V17" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path d="M16 3.13a4 4 0 010 7.75" />
      <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

const PRIMARY_NAV = [{ label: "코인", href: "/", Icon: IconCoin }];

const SECONDARY_NAV = [
  { label: "관심종목", href: "/watchlist", Icon: IconStar },
  { label: "내 계좌", href: "/account", Icon: IconWallet },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoArea}>
        <div className={styles.logoMark}>
          <span>T</span>
        </div>
        <span className={styles.logoText}>
          toss<strong>invest</strong>
        </span>
      </div>

      {/* Primary navigation */}
      <nav className={styles.nav}>
        {PRIMARY_NAV.map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.navItem} ${isActive(href) ? styles.active : ""}`}
          >
            <span className={styles.navIcon}>
              <Icon />
            </span>
            <span className={styles.navLabel}>{label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.divider} />

      {/* Secondary navigation */}
      <nav className={styles.nav}>
        {SECONDARY_NAV.map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.navItem} ${isActive(href) ? styles.active : ""}`}
          >
            <span className={styles.navIcon}>
              <Icon />
            </span>
            <span className={styles.navLabel}>{label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.spacer} />

      {/* Bottom */}
      <nav className={styles.nav}>
        <Link
          href="/settings"
          className={`${styles.navItem} ${isActive("/settings") ? styles.active : ""}`}
        >
          <span className={styles.navIcon}>
            <IconSettings />
          </span>
          <span className={styles.navLabel}>설정</span>
        </Link>
      </nav>
    </aside>
  );
}
