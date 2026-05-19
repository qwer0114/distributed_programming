export class HoldingCoin {
  currency: string;
  balance: number;
  locked: number;
  avgBuyPrice: number;
  unitCurrency: string;
  evalAmount: number;

  constructor(currency: string, balance: number, avgBuyPrice: number, unitCurrency: string = 'KRW') {
    this.currency = currency;
    this.balance = balance;
    this.locked = 0;
    this.avgBuyPrice = avgBuyPrice;
    this.unitCurrency = unitCurrency;
    this.evalAmount = balance * avgBuyPrice;
  }

  getProfitRate(currentPrice: number): number {
    if (this.avgBuyPrice === 0) return 0;
    return ((currentPrice - this.avgBuyPrice) / this.avgBuyPrice) * 100;
  }

  getEvalAmount(currentPrice: number): number {
    return this.balance * currentPrice;
  }
}
