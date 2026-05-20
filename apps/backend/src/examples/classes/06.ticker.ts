// ─────────────────────────────────────────────────────────────
// 클래스 6: 티커 (Ticker)
//
// 코인 실시간 현재가 스냅샷.
// 업비트 /v1/ticker API 응답 필드를 그대로 매핑합니다.
// ─────────────────────────────────────────────────────────────

export class Ticker {
  private market: string;             // 마켓 코드
  private tradePrice: number;         // 현재 체결가
  private openingPrice: number;       // 당일 시가
  private highPrice: number;          // 당일 고가
  private lowPrice: number;           // 당일 저가
  private prevClosingPrice: number;   // 전일 종가
  private change: string;             // 'RISE' | 'FALL' | 'EVEN'
  private changeRate: number;         // 등락률 (부호 없음, 0.0235 = 2.35%)
  private accTradeVolume24h: number;  // 24시간 누적 거래량
  private tradeTimestamp: number;     // 마지막 체결 Unix 밀리초

  constructor(
    market: string, tradePrice: number, openingPrice: number,
    highPrice: number, lowPrice: number, prevClosingPrice: number,
    change: string, changeRate: number,
    accTradeVolume24h: number, tradeTimestamp: number,
  ) {
    this.market            = market;
    this.tradePrice        = tradePrice;
    this.openingPrice      = openingPrice;
    this.highPrice         = highPrice;
    this.lowPrice          = lowPrice;
    this.prevClosingPrice  = prevClosingPrice;
    this.change            = change;
    this.changeRate        = changeRate;
    this.accTradeVolume24h = accTradeVolume24h;
    this.tradeTimestamp    = tradeTimestamp;
  }

  // change 방향을 반영한 부호 포함 등락률
  // RISE: +0.0235, FALL: -0.0235, EVEN: 0
  getChangeRate(): number {
    if (this.change === 'RISE') return this.changeRate;
    if (this.change === 'FALL') return -this.changeRate;
    return 0;
  }

  // 상승 중이면 true
  isRising(): boolean { return this.change === 'RISE'; }

  getMarket(): string            { return this.market; }
  getTradePrice(): number        { return this.tradePrice; }
  getOpeningPrice(): number      { return this.openingPrice; }
  getHighPrice(): number         { return this.highPrice; }
  getLowPrice(): number          { return this.lowPrice; }
  getPrevClosingPrice(): number  { return this.prevClosingPrice; }
  getChange(): string            { return this.change; }
  getAccTradeVolume24h(): number { return this.accTradeVolume24h; }
  getTradeTimestamp(): number    { return this.tradeTimestamp; }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const ticker = new Ticker('KRW-BTC', 145_000_000, 140_000_000,
//   148_000_000, 139_000_000, 141_000_000,
//   'RISE', 0.0235, 1234.5, Date.now());
//
// ticker.getChangeRate();  // +0.0235  (부호 포함)
// ticker.isRising();       // true
