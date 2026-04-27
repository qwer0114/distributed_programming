import { getMarkets } from "@/api/market";
import MarketTable from "@/components/MarketTable";

export const metadata = {
  title: "암호화폐 시세",
};

export default async function HomePage() {
  const markets = await getMarkets();

  return (
    <main>
      <MarketTable markets={markets} />
    </main>
  );
}
