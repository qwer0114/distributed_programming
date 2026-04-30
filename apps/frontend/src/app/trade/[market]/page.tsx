import { notFound } from "next/navigation";
import { getMarkets } from "@/api/market";
import TradeView from "@/components/TradeView";

interface PageProps {
  params: Promise<{ market: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { market } = await params;
  return { title: market };
}

export default async function TradePage({ params }: PageProps) {
  const { market } = await params;
  const markets = await getMarkets();
  const found = markets.find((m) => m.market === market);
  if (!found) {
    notFound();
  }
  return <TradeView market={found} />;
}
