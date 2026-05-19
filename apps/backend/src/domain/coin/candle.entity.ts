export class Candle {
  private market: string;
  private candleDateTimeKst: string;
  private openingPrice: number;
  private highPrice: number;
  private lowPrice: number;
  private tradePrice: number;
  private candleAccTradeVolume: number;
  private unit: number;

  constructor(
    market: string,
    candleDateTimeKst: string,
    openingPrice: number,
    highPrice: number,
    lowPrice: number,
    tradePrice: number,
    candleAccTradeVolume: number,
    unit: number = 0,
  ) {
    this.market = market;
    this.candleDateTimeKst = candleDateTimeKst;
    this.openingPrice = openingPrice;
    this.highPrice = highPrice;
    this.lowPrice = lowPrice;
    this.tradePrice = tradePrice;
    this.candleAccTradeVolume = candleAccTradeVolume;
    this.unit = unit;
  }

  getCandleData(): Candle {
    return this;
  }

  getMarket(): string { return this.market; }
  getCandleDateTimeKst(): string { return this.candleDateTimeKst; }
  getOpeningPrice(): number { return this.openingPrice; }
  getHighPrice(): number { return this.highPrice; }
  getLowPrice(): number { return this.lowPrice; }
  getTradePrice(): number { return this.tradePrice; }
  getCandleAccTradeVolume(): number { return this.candleAccTradeVolume; }
  getUnit(): number { return this.unit; }
}
