import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import styles from "./layout.module.css";
import { Providers } from "./providers";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: {
    template: "%s | 코인시세",
    default: "코인시세",
  },
  description: "업비트 실시간 암호화폐 시세",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <div className={styles.appShell}>
            <Sidebar />
            <div className={styles.mainArea}>
              <Header />
              <main className={styles.content}>{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
