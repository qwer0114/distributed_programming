import { HoldingCoin } from './holding-coin.entity';

export class Portfolio {
  private totalEvalAmount: number = 0;
  private totalBuyAmount: number = 0;
  private totalProfitRate: number = 0;
  holdings: HoldingCoin[] = [];

  upsertHolding(currency: string, volume: number, price: number): void {
    const existing = this.holdings.find(h => h.currency === currency);
    if (existing) {
      const newAvg = (existing.avgBuyPrice * existing.balance + price * volume) / (existing.balance + volume);
      existing.avgBuyPrice = newAvg;
      existing.balance += volume;
      existing.evalAmount = existing.balance * price;
    } else {
      this.holdings.push(new HoldingCoin(currency, volume, price));
    }
    this.recalcTotals(price, currency);
  }

  reduceHolding(currency: string, volume: number): void {
    const idx = this.holdings.findIndex(h => h.currency === currency);
    if (idx === -1) return;
    this.holdings[idx].balance -= volume;
    if (this.holdings[idx].balance <= 0) {
      this.holdings.splice(idx, 1);
    }
  }

  getHolding(currency: string): HoldingCoin | undefined {
    return this.holdings.find(h => h.currency === currency);
  }

  calcProfitRate(): number {
    if (this.totalBuyAmount === 0) return 0;
    return ((this.totalEvalAmount - this.totalBuyAmount) / this.totalBuyAmount) * 100;
  }

  analyzeProfit(currentPrices: Map<string, number>): void {
    console.log('\n  📊 손익 분석 상세:');
    for (const holding of this.holdings) {
      const currentPrice = currentPrices.get(`KRW-${holding.currency}`) ?? holding.avgBuyPrice;
      const evalAmount = holding.getEvalAmount(currentPrice);
      const profitRate = holding.getProfitRate(currentPrice);
      const profit = evalAmount - holding.avgBuyPrice * holding.balance;
      const sign = profit >= 0 ? '+' : '';
      console.log(
        `  ${holding.currency}: 보유 ${holding.balance} | 평균매수가 ${fmt(holding.avgBuyPrice)}원 | ` +
        `현재가 ${fmt(currentPrice)}원 | 평가금액 ${fmt(evalAmount)}원 | ` +
        `손익 ${sign}${fmt(profit)}원 (${sign}${profitRate.toFixed(2)}%)`,
      );
    }
  }

  private recalcTotals(latestPrice: number, currency: string): void {
    this.totalBuyAmount = this.holdings.reduce((sum, h) => sum + h.avgBuyPrice * h.balance, 0);
    this.totalEvalAmount = this.holdings.reduce((sum, h) => {
      const price = h.currency === currency ? latestPrice : h.avgBuyPrice;
      return sum + h.getEvalAmount(price);
    }, 0);
    this.totalProfitRate = this.calcProfitRate();
  }

  getTotalEvalAmount(): number { return this.totalEvalAmount; }
  getTotalBuyAmount(): number { return this.totalBuyAmount; }
  getTotalProfitRate(): number { return this.totalProfitRate; }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}
