export class OrderBookUnit {
  private askPrice: number;
  private askSize: number;
  private bidPrice: number;
  private bidSize: number;

  constructor(askPrice: number, askSize: number, bidPrice: number, bidSize: number) {
    this.askPrice = askPrice;
    this.askSize = askSize;
    this.bidPrice = bidPrice;
    this.bidSize = bidSize;
  }

  getAskPrice(): number { return this.askPrice; }
  getAskSize(): number { return this.askSize; }
  getBidPrice(): number { return this.bidPrice; }
  getBidSize(): number { return this.bidSize; }
}

export class OrderBook {
  private market: string;
  private timestamp: number;
  private totalAskSize: number;
  private totalBidSize: number;
  private units: OrderBookUnit[];

  constructor(
    market: string,
    timestamp: number,
    totalAskSize: number,
    totalBidSize: number,
    units: OrderBookUnit[],
  ) {
    this.market = market;
    this.timestamp = timestamp;
    this.totalAskSize = totalAskSize;
    this.totalBidSize = totalBidSize;
    this.units = units;
  }

  getOrderBook(): OrderBook {
    return this;
  }

  getSpread(): number {
    if (this.units.length === 0) return 0;
    return this.units[0].getAskPrice() - this.units[0].getBidPrice();
  }

  getMarket(): string { return this.market; }
  getTimestamp(): number { return this.timestamp; }
  getTotalAskSize(): number { return this.totalAskSize; }
  getTotalBidSize(): number { return this.totalBidSize; }
  getUnits(): OrderBookUnit[] { return this.units; }
}
