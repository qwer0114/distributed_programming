// ─────────────────────────────────────────────────────────────
// 클래스 8: 호가 (OrderBook) + 호가단위 (OrderBookUnit)
//
// 코인 매수/매도 호가 정보.
// 업비트 /v1/orderbook 응답을 기반으로 합니다.
//
// Composition ◆:
//   OrderBook이 OrderBookUnit 배열을 소유합니다.
//   OrderBook 없이 OrderBookUnit은 독립적으로 존재하지 않습니다.
// ─────────────────────────────────────────────────────────────


// ─── 클래스 9: 호가단위 (OrderBookUnit) ──────────────────────
// OrderBook의 Composition 부분.
// 호가창의 한 줄 (매도 가격/수량, 매수 가격/수량)을 나타냅니다.
export class OrderBookUnit {
  private askPrice: number; // 매도 호가
  private askSize: number;  // 매도 잔량
  private bidPrice: number; // 매수 호가
  private bidSize: number;  // 매수 잔량

  constructor(askPrice: number, askSize: number, bidPrice: number, bidSize: number) {
    this.askPrice = askPrice;
    this.askSize  = askSize;
    this.bidPrice = bidPrice;
    this.bidSize  = bidSize;
  }

  getAskPrice(): number { return this.askPrice; }
  getAskSize(): number  { return this.askSize; }
  getBidPrice(): number { return this.bidPrice; }
  getBidSize(): number  { return this.bidSize; }
}


// ─── 클래스 8: 호가 (OrderBook) ──────────────────────────────
export class OrderBook {
  private market: string;       // 마켓 코드
  private timestamp: number;    // 호가 생성 시각 (Unix 밀리초)
  private totalAskSize: number; // 매도 호가 총 잔량
  private totalBidSize: number; // 매수 호가 총 잔량
  private units: OrderBookUnit[]; // Composition ◆ — 호가단위 배열

  constructor(
    market: string, timestamp: number,
    totalAskSize: number, totalBidSize: number,
    units: OrderBookUnit[],
  ) {
    this.market       = market;
    this.timestamp    = timestamp;
    this.totalAskSize = totalAskSize;
    this.totalBidSize = totalBidSize;
    this.units        = units;
  }

  // 호가 데이터 자신을 반환
  getOrderBook(): OrderBook { return this; }

  // 스프레드 = 최우선 매도호가 - 최우선 매수호가
  // 스프레드가 클수록 유동성이 낮음을 의미
  getSpread(): number {
    if (this.units.length === 0) return 0;
    return this.units[0].getAskPrice() - this.units[0].getBidPrice();
  }

  getMarket(): string         { return this.market; }
  getTimestamp(): number      { return this.timestamp; }
  getTotalAskSize(): number   { return this.totalAskSize; }
  getTotalBidSize(): number   { return this.totalBidSize; }
  getUnits(): OrderBookUnit[] { return [...this.units]; }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const units = [
//   new OrderBookUnit(145_001_000, 0.3, 144_999_000, 0.5),
//   new OrderBookUnit(145_002_000, 0.2, 144_998_000, 0.4),
// ];
// const ob = new OrderBook('KRW-BTC', Date.now(), 1.2, 3.4, units);
//
// ob.getSpread();  // 145_001_000 - 144_999_000 = 2_000원
