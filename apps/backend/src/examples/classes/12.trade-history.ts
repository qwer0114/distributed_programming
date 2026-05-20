// ─────────────────────────────────────────────────────────────
// 클래스 12: 거래내역 (TradeHistory)
//
// 매수·매도 시 생성되는 거래 기록.
// 업비트 /v1/orders 응답 필드를 기반으로 합니다.
//
// Association ← 회원 (1:*)
//   - 회원이 삭제되어도 거래내역은 보존됩니다 (감사 목적)
//   - Composition이 아닌 Association 관계인 이유가 이것입니다
// ─────────────────────────────────────────────────────────────

export class TradeHistory {
  private uuid: string;      // 거래 고유 식별자
  private side: 'ask' | 'bid'; // ask=매도, bid=매수
  private ordType: string;   // 'limit'(지정가) | 'price'(시장가매수) | 'market'(시장가매도)
  private price: number;     // 주문 가격
  private volume: number;    // 주문 수량
  private market: string;    // 마켓 코드. 예: 'KRW-BTC'
  private createdAt: string; // 주문 생성 일시. ISO 8601
  private state: 'done' | 'cancel' | 'wait'; // 체결 상태
  private paidFee: number;   // 실제 지불 수수료

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
    this.uuid      = uuid;
    this.side      = side;
    this.ordType   = ordType;
    this.price     = price;
    this.volume    = volume;
    this.market    = market;
    this.createdAt = createdAt;
    this.state     = state;
    this.paidFee   = paidFee;
  }

  // 거래내역 자신을 반환
  getTradeInfo(): TradeHistory { return this; }

  // 총 거래금액 (수수료 미포함)
  getTotalAmount(): number { return this.price * this.volume; }

  // 매수인지 여부
  isBid(): boolean { return this.side === 'bid'; }

  getUuid(): string      { return this.uuid; }
  getSide(): string      { return this.side; }
  getOrdType(): string   { return this.ordType; }
  getPrice(): number     { return this.price; }
  getVolume(): number    { return this.volume; }
  getMarket(): string    { return this.market; }
  getCreatedAt(): string { return this.createdAt; }
  getState(): string     { return this.state; }
  getPaidFee(): number   { return this.paidFee; }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const history = new TradeHistory(
//   'trade-001', 'bid', 'limit',
//   145_000_000, 0.001, 'KRW-BTC',
//   new Date().toISOString(), 'done',
//   145_000_000 * 0.001 * 0.0005,  // 수수료 0.05%
// );
//
// history.getTotalAmount();  // 145_000원
// history.isBid();           // true (매수)
