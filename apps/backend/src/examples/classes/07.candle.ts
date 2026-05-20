// ─────────────────────────────────────────────────────────────
// 클래스 7: 캔들 (Candle)
//
// 코인 OHLCV 시계열 데이터.
// 업비트 /v1/candles/minutes/{unit} 응답을 기반으로 합니다.
//
// OHLCV = Open(시가) High(고가) Low(저가) Close(종가) Volume(거래량)
// ─────────────────────────────────────────────────────────────

export class Candle {
  private market: string;               // 마켓 코드
  private candleDateTimeKst: string;    // 캔들 기준 시각(KST). 'yyyy-MM-dd HH:mm:ss'
  private openingPrice: number;         // 시가
  private highPrice: number;            // 고가
  private lowPrice: number;             // 저가
  private tradePrice: number;           // 종가
  private candleAccTradeVolume: number; // 해당 캔들 기간 누적 거래량
  private unit: number;                 // 분봉 단위 (1/3/5/10/15/30/60/240, 일봉=0)

  constructor(
    market: string, candleDateTimeKst: string,
    openingPrice: number, highPrice: number, lowPrice: number, tradePrice: number,
    candleAccTradeVolume: number, unit: number,
  ) {
    this.market                = market;
    this.candleDateTimeKst     = candleDateTimeKst;
    this.openingPrice          = openingPrice;
    this.highPrice             = highPrice;
    this.lowPrice              = lowPrice;
    this.tradePrice            = tradePrice;
    this.candleAccTradeVolume  = candleAccTradeVolume;
    this.unit                  = unit;
  }

  // 캔들 데이터 자신을 반환
  getCandleData(): Candle { return this; }

  // 캔들 방향: 종가 > 시가이면 양봉
  isBullish(): boolean { return this.tradePrice > this.openingPrice; }

  // 캔들 변동폭 (고가 - 저가)
  getRange(): number { return this.highPrice - this.lowPrice; }

  getCandleDateTimeKst(): string      { return this.candleDateTimeKst; }
  getMarket(): string                 { return this.market; }
  getOpeningPrice(): number           { return this.openingPrice; }
  getHighPrice(): number              { return this.highPrice; }
  getLowPrice(): number               { return this.lowPrice; }
  getTradePrice(): number             { return this.tradePrice; }
  getCandleAccTradeVolume(): number   { return this.candleAccTradeVolume; }
  getUnit(): number                   { return this.unit; }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const candle = new Candle(
//   'KRW-BTC', '2025-05-20 14:00:00',
//   143_000_000, 146_000_000, 142_000_000, 145_000_000,
//   0.523, 60,
// );
// candle.isBullish();  // true (종가 145M > 시가 143M)
// candle.getRange();   // 4_000_000 (고가 - 저가)
