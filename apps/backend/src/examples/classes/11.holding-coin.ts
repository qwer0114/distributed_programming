// ─────────────────────────────────────────────────────────────
// 클래스 11: 보유코인 (HoldingCoin)
//
// 회원이 보유한 특정 코인의 수량·평균매수가·평가금액.
// 업비트 /v1/accounts 응답 필드를 기반으로 합니다.
//
// Composition 부분 ◆ ← Portfolio
// Portfolio 없이 단독으로 존재하지 않습니다.
// ─────────────────────────────────────────────────────────────

export class HoldingCoin {
  currency: string;      // 코인 심볼. 예: 'BTC'
  balance: number;       // 현재 보유 수량
  locked: number;        // 매도 주문 중 묶인 수량
  avgBuyPrice: number;   // 평균 매수가
  unitCurrency: string;  // 기준 통화. 항상 'KRW'
  evalAmount: number;    // 현재가 기준 평가금액 (balance × 현재가)

  constructor(currency: string, balance: number, avgBuyPrice: number, unitCurrency: string = 'KRW') {
    this.currency     = currency;
    this.balance      = balance;
    this.locked       = 0;
    this.avgBuyPrice  = avgBuyPrice;
    this.unitCurrency = unitCurrency;
    this.evalAmount   = balance * avgBuyPrice;
  }

  // 수익률(%) = (현재가 - 평균매수가) / 평균매수가 × 100
  getProfitRate(currentPrice: number): number {
    if (this.avgBuyPrice === 0) return 0;
    return ((currentPrice - this.avgBuyPrice) / this.avgBuyPrice) * 100;
  }

  // 평가금액 = 보유 수량 × 현재가
  getEvalAmount(currentPrice: number): number {
    return this.balance * currentPrice;
  }

  // 매수 가능 수량 = 보유 - 묶인 수량
  getAvailableBalance(): number {
    return this.balance - this.locked;
  }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const holding = new HoldingCoin('BTC', 0.01, 140_000_000);
// const currentPrice = 145_000_000;
//
// holding.getProfitRate(currentPrice);  // +3.57%
// holding.getEvalAmount(currentPrice);  // 1_450_000원
