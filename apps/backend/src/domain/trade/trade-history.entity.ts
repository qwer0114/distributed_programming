export class TradeHistory {
  private uuid: string;
  private side: 'ask' | 'bid';
  private ordType: string;
  private price: number;
  private volume: number;
  private market: string;
  private createdAt: string;
  private state: 'done' | 'cancel' | 'wait';
  private paidFee: number;

  constructor(
    uuid: string,
    side: 'ask' | 'bid',
    ordType: string,
    price: number,
    volume: number,
    market: string,
    createdAt: string,
    state: 'done' | 'cancel' | 'wait',
    paidFee: number,
  ) {
    this.uuid = uuid;
    this.side = side;
    this.ordType = ordType;
    this.price = price;
    this.volume = volume;
    this.market = market;
    this.createdAt = createdAt;
    this.state = state;
    this.paidFee = paidFee;
  }

  getTradeInfo(): TradeHistory {
    return this;
  }

  getUuid(): string { return this.uuid; }
  getSide(): string { return this.side; }
  getOrdType(): string { return this.ordType; }
  getPrice(): number { return this.price; }
  getVolume(): number { return this.volume; }
  getMarket(): string { return this.market; }
  getCreatedAt(): string { return this.createdAt; }
  getState(): string { return this.state; }
  getPaidFee(): number { return this.paidFee; }
}
