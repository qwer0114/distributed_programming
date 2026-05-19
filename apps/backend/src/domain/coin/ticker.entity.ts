export class Ticker {
  private market: string;
  private tradePrice: number;
  private openingPrice: number;
  private highPrice: number;
  private lowPrice: number;
  private prevClosingPrice: number;
  private change: string;
  private changeRate: number;
  private accTradeVolume24h: number;
  private tradeTimestamp: number;

  constructor(
    market: string,
    tradePrice: number,
    openingPrice: number,
    highPrice: number,
    lowPrice: number,
    prevClosingPrice: number,
    change: string,
    changeRate: number,
    accTradeVolume24h: number,
    tradeTimestamp: number,
  ) {
    this.market = market;
    this.tradePrice = tradePrice;
    this.openingPrice = openingPrice;
    this.highPrice = highPrice;
    this.lowPrice = lowPrice;
    this.prevClosingPrice = prevClosingPrice;
    this.change = change;
    this.changeRate = changeRate;
    this.accTradeVolume24h = accTradeVolume24h;
    this.tradeTimestamp = tradeTimestamp;
  }

  getChangeRate(): number {
    return this.change === 'FALL' ? -this.changeRate : this.changeRate;
  }

  isRising(): boolean {
    return this.change === 'RISE';
  }

  getTradePrice(): number {
    return this.tradePrice;
  }

  getMarket(): string {
    return this.market;
  }

  getChange(): string {
    return this.change;
  }

  getAccTradeVolume24h(): number {
    return this.accTradeVolume24h;
  }
}
