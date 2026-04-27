import { getMarkets } from "@/api/market";
import MarketTable from "@/components/MarketTable";

export const metadata = {
  title: "코인",
};

export default async function HomePage() {
  const markets = await getMarkets();
  return <MarketTable markets={markets} />;
}
