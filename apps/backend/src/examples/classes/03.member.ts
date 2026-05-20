// ─────────────────────────────────────────────────────────────
// 클래스 3: 회원 (Member)
//
// 인증된 사용자. 매수·매도·자산 관리 전용 기능을 수행합니다.
// 지갑·포트폴리오·즐겨찾기를 Composition으로 소유합니다.
//
// Composition ◆ 의미:
//   Member가 생성되면 Wallet/Portfolio/Watchlist도 함께 생성됩니다.
//   Member가 삭제되면 이 셋도 함께 소멸됩니다.
// ─────────────────────────────────────────────────────────────

import { User }         from './01.user';
import { Wallet }       from './04.wallet';
import { Portfolio }    from './10.portfolio';
import { Watchlist }    from './13.watchlist';
import { TradeHistory } from './12.trade-history';

export class Member extends User {
  private email: string;
  private password: string;    // bcrypt 해시 저장 (평문 금지)
  private createdAt: string;   // ISO 8601

  // Composition: Member 생성 시 함께 생성, Member 소멸 시 함께 소멸
  private wallet: Wallet;
  private portfolio: Portfolio;
  private watchlist: Watchlist;

  // Association: 거래내역은 Member 삭제 후에도 보존 가능 (감사 목적)
  private tradeHistories: TradeHistory[] = [];

  constructor(userId: string, nickname: string, email: string, password: string) {
    super(userId, nickname);
    this.email     = email;
    this.password  = password;
    this.createdAt = new Date().toISOString();

    // Composition — 생성자에서 함께 생성
    this.wallet    = new Wallet();
    this.portfolio = new Portfolio();
    this.watchlist = new Watchlist();
  }

  override login(): void {
    console.log(`[Member] ${this.nickname} (${this.email}) 로그인`);
  }

  // UC7: KRW 충전 — 내부적으로 Wallet.charge() 호출
  charge(amount: number): void {
    this.wallet.charge(amount); // 최소 10,000원 검증은 Wallet에서
  }

  // UC5: 코인 매수
  buyCoin(market: string, volume: number, currentPrice: number): TradeHistory {
    if (volume < 0.0001) throw new Error('최소 주문 수량은 0.0001입니다.');

    const requiredAmount = currentPrice * volume;
    this.wallet.deduct(requiredAmount); // 잔액 부족 시 Wallet에서 에러 발생

    const currency = market.replace('KRW-', '');
    this.portfolio.upsertHolding(currency, volume, currentPrice);

    const fee     = requiredAmount * 0.0005; // 수수료 0.05%
    const history = new TradeHistory(
      `trade-${Date.now()}`, 'bid', 'limit',
      currentPrice, volume, market,
      new Date().toISOString(), 'done', fee,
    );
    this.tradeHistories.push(history);
    return history;
  }

  // UC6: 코인 매도
  sellCoin(market: string, volume: number, currentPrice: number): TradeHistory {
    if (volume < 0.0001) throw new Error('최소 주문 수량은 0.0001입니다.');

    const currency = market.replace('KRW-', '');
    const holding  = this.portfolio.getHolding(currency);
    if (!holding) throw new Error('보유하지 않은 코인입니다.');
    if (holding.balance - holding.locked < volume) throw new Error('보유량이 부족합니다.');

    this.portfolio.reduceHolding(currency, volume);

    const fee      = currentPrice * volume * 0.0005;
    const proceeds = currentPrice * volume - fee;
    this.wallet.credit(proceeds); // 매도 대금을 지갑에 입금

    const history = new TradeHistory(
      `trade-${Date.now()}`, 'ask', 'market',
      currentPrice, volume, market,
      new Date().toISOString(), 'done', fee,
    );
    this.tradeHistories.push(history);
    return history;
  }

  // UC8: 포트폴리오 반환
  viewPortfolio(): Portfolio { return this.portfolio; }

  // UC9: 거래내역 반환
  viewTradeHistory(): TradeHistory[] { return [...this.tradeHistories]; }

  getWallet(): Wallet       { return this.wallet; }
  getWatchlist(): Watchlist { return this.watchlist; }
  getEmail(): string        { return this.email; }
  getCreatedAt(): string    { return this.createdAt; }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const member = new Member('u-1', '홍길동', 'test@test.com', 'hashed_pw');
// member.charge(100_000);
// const history = member.buyCoin('KRW-BTC', 0.001, 145_000_000);
// const portfolio = member.viewPortfolio();
