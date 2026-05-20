// ─────────────────────────────────────────────────────────────
// 클래스 5: 코인 (Coin)
//
// 거래 가능한 코인 종목 정보.
// 업비트 /v1/market/all API 응답을 기반으로 합니다.
//
// Association 관계로 여러 클래스에서 참조됩니다:
//   Ticker → Coin
//   Candle → Coin
//   OrderBook → Coin
//   HoldingCoin → Coin
//   TradeHistory → Coin
//   Watchlist ↔ Coin (N:M)
// ─────────────────────────────────────────────────────────────

export class Coin {
  private market: string;        // 마켓 코드. 예: 'KRW-BTC'
  private koreanName: string;    // 한국어 이름. 예: '비트코인'
  private englishName: string;   // 영문 이름. 예: 'Bitcoin'
  private marketWarning: string; // 'NONE' 또는 'CAUTION'

  constructor(market: string, koreanName: string, englishName: string, marketWarning: string) {
    this.market        = market;
    this.koreanName    = koreanName;
    this.englishName   = englishName;
    this.marketWarning = marketWarning;
  }

  getMarketCode(): string    { return this.market; }
  getKoreanName(): string    { return this.koreanName; }
  getEnglishName(): string   { return this.englishName; }
  getMarketWarning(): string { return this.marketWarning; }

  isCaution(): boolean { return this.marketWarning === 'CAUTION'; }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const btc = new Coin('KRW-BTC', '비트코인', 'Bitcoin', 'NONE');
// btc.getMarketCode();  // 'KRW-BTC'
// btc.isCaution();      // false
