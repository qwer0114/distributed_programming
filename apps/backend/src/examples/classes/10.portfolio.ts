// ─────────────────────────────────────────────────────────────
// 클래스 10: 포트폴리오 (Portfolio)
//
// 회원의 전체 투자 현황 집계.
// 보유코인(HoldingCoin)을 Composition으로 포함합니다.
//
// Composition 구조:
//   Member ◆→ Portfolio ◆→ HoldingCoin[]
// ─────────────────────────────────────────────────────────────

import { HoldingCoin } from './11.holding-coin';

export class Portfolio {
  private totalEvalAmount: number  = 0; // 보유 코인 전체 평가금액 합계
  private totalBuyAmount: number   = 0; // 전체 매수금액 합계
  private totalProfitRate: number  = 0; // 전체 수익률(%)

  // Composition ◆ — Portfolio가 HoldingCoin 배열을 소유
  holdings: HoldingCoin[] = [];

  // 매수 시 호출: 기존 보유 코인이면 평균 단가 재계산, 없으면 신규 추가
  upsertHolding(currency: string, volume: number, price: number): void {
    const existing = this.holdings.find(h => h.currency === currency);

    if (existing) {
      // 가중평균 단가: (기존단가 × 기존수량 + 신규단가 × 신규수량) / 전체수량
      const newAvg = (existing.avgBuyPrice * existing.balance + price * volume)
        / (existing.balance + volume);
      existing.avgBuyPrice = newAvg;
      existing.balance    += volume;
      existing.evalAmount  = existing.balance * price;
    } else {
      this.holdings.push(new HoldingCoin(currency, volume, price));
    }
  }

  // 매도 시 호출: 수량 차감, 전량 매도 시 목록에서 제거
  reduceHolding(currency: string, volume: number): void {
    const idx = this.holdings.findIndex(h => h.currency === currency);
    if (idx === -1) return;
    this.holdings[idx].balance -= volume;
    if (this.holdings[idx].balance <= 0) {
      this.holdings.splice(idx, 1);
    }
  }

  // 특정 코인 보유 정보 조회
  getHolding(currency: string): HoldingCoin | undefined {
    return this.holdings.find(h => h.currency === currency);
  }

  // UC16: 전체 수익률 계산 및 반환
  calcProfitRate(): number {
    if (this.totalBuyAmount === 0) return 0;
    return ((this.totalEvalAmount - this.totalBuyAmount) / this.totalBuyAmount) * 100;
  }

  // UC16: 손익 분석 — 코인별 상세 출력
  analyzeProfit(currentPrices: Map<string, number>): void {
    console.log('\n  📊 손익 분석:');
    let totalEval = 0;
    let totalBuy  = 0;

    for (const h of this.holdings) {
      const price    = currentPrices.get(`KRW-${h.currency}`) ?? h.avgBuyPrice;
      const evalAmt  = h.getEvalAmount(price);
      const buyAmt   = h.avgBuyPrice * h.balance;
      const profit   = evalAmt - buyAmt;
      const rate     = h.getProfitRate(price);
      const sign     = profit >= 0 ? '+' : '';

      console.log(
        `  ${h.currency}: 보유 ${h.balance} | 평균매수가 ${fmt(h.avgBuyPrice)}원 | ` +
        `현재가 ${fmt(price)}원 | 손익 ${sign}${fmt(profit)}원 (${sign}${rate.toFixed(2)}%)`,
      );
      totalEval += evalAmt;
      totalBuy  += buyAmt;
    }

    const totalProfit = totalEval - totalBuy;
    const totalRate   = totalBuy > 0 ? (totalProfit / totalBuy) * 100 : 0;
    const sign        = totalProfit >= 0 ? '+' : '';
    console.log(`\n  총 평가금액: ${fmt(totalEval)}원 | 총 손익: ${sign}${fmt(totalProfit)}원 (${sign}${totalRate.toFixed(2)}%)`);
  }

  getTotalEvalAmount(): number  { return this.totalEvalAmount; }
  getTotalBuyAmount(): number   { return this.totalBuyAmount; }
  getTotalProfitRate(): number  { return this.totalProfitRate; }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const portfolio = new Portfolio();
// portfolio.upsertHolding('BTC', 0.001, 140_000_000); // BTC 매수
// portfolio.upsertHolding('BTC', 0.001, 150_000_000); // 추가 매수 → 평균단가 145M
//
// portfolio.getHolding('BTC')?.avgBuyPrice; // 145_000_000
// portfolio.reduceHolding('BTC', 0.002);    // 전량 매도 → holdings 비어짐
