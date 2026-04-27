import { getMarkets } from "@/api/market";
import { formatDate } from "@repo/lib";

export default async function HomePage() {
  const market = await getMarkets();

  console.log(market);

  return (
    <main>
      <h1>Turborepo + pnpm Monorepo</h1>
      <section>
        <h2>Frontend</h2>
        <p>Next.js 15 App Router running on {formatDate(new Date())}</p>
      </section>
      <section>
        <h2>Backend Health</h2>
      </section>
    </main>
  );
}
