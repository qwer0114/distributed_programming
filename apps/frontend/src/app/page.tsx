import { formatDate } from "@repo/lib";
import type { HealthCheckResponse } from "@repo/types";

async function getBackendHealth(): Promise<HealthCheckResponse | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/health`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    return res.json() as Promise<HealthCheckResponse>;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await getBackendHealth();

  return (
    <main>
      <h1>Turborepo + pnpm Monorepo</h1>
      <section>
        <h2>Frontend</h2>
        <p>Next.js 15 App Router running on {formatDate(new Date())}</p>
      </section>
      <section>
        <h2>Backend Health</h2>
        {health ? (
          <dl>
            <dt>Status</dt>
            <dd>{health.status}</dd>
            <dt>Uptime</dt>
            <dd>{health.uptime}s</dd>
            <dt>Last checked</dt>
            <dd>{health.timestamp}</dd>
          </dl>
        ) : (
          <p>Backend is not reachable. Start it with: pnpm dev:backend</p>
        )}
      </section>
    </main>
  );
}
