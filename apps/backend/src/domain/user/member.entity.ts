import { Portfolio } from '../member/portfolio.entity';
import { Wallet } from '../member/wallet.entity';
import { Watchlist } from '../member/watchlist.entity';
import { TradeHistory } from '../trade/trade-history.entity';
import { User } from './user.entity';

let tradeSeq = 0;

function generateUuid(): string {
  return `trade-${++tradeSeq}-${Date.now()}`;
}

export class Member extends User {
  private email: string;
  private password: string;
  private createdAt: string;
  private wallet: Wallet;
  private portfolio: Portfolio;
  private watchlist: Watchlist;
  private tradeHistories: TradeHistory[] = [];

  constructor(userId: string, nickname: string, email: string, password: string) {
    super(userId, nickname);
    this.email = email;
    this.password = password;
    this.createdAt = new Date().toISOString();
    this.wallet = new Wallet();
    this.portfolio = new Portfolio();
    this.watchlist = new Watchlist();
  }

  override login(): void {
    console.log(`  [로그인] ${this.nickname} (${this.email})`);
  }

  charge(amount: number): void {
    this.wallet.charge(amount);
  }

  buyCoin(market: string, volume: number, currentPrice: number): TradeHistory {
    if (volume < 0.0001) {
      throw new Error('최소 주문 수량은 0.0001입니다.');
    }
    const requiredAmount = currentPrice * volume;
    this.wallet.deduct(requiredAmount);

    const currency = market.replace('KRW-', '');
    this.portfolio.upsertHolding(currency, volume, currentPrice);

    const fee = requiredAmount * 0.0005;
    const history = new TradeHistory(
      generateUuid(),
      'bid',
      'limit',
      currentPrice,
      volume,
      market,
      new Date().toISOString(),
      'done',
      fee,
    );
    this.tradeHistories.push(history);
    return history;
  }

  sellCoin(market: string, volume: number, currentPrice: number): TradeHistory {
    if (volume < 0.0001) {
      throw new Error('최소 주문 수량은 0.0001입니다.');
    }
    const currency = market.replace('KRW-', '');
    const holding = this.portfolio.getHolding(currency);
    if (!holding) {
      throw new Error('보유하지 않은 코인입니다.');
    }
    if (holding.balance - holding.locked < volume) {
      throw new Error('보유량이 부족합니다.');
    }

    this.portfolio.reduceHolding(currency, volume);

    const fee = currentPrice * volume * 0.0005;
    this.wallet.credit(currentPrice * volume - fee);

    const history = new TradeHistory(
      generateUuid(),
      'ask',
      'market',
      currentPrice,
      volume,
      market,
      new Date().toISOString(),
      'done',
      fee,
    );
    this.tradeHistories.push(history);
    return history;
  }

  viewPortfolio(): Portfolio {
    return this.portfolio;
  }

  viewTradeHistory(): TradeHistory[] {
    return [...this.tradeHistories];
  }

  getWallet(): Wallet {
    return this.wallet;
  }

  getWatchlist(): Watchlist {
    return this.watchlist;
  }

  loadTradeHistory(h: TradeHistory): void {
    this.tradeHistories.push(h);
  }

  getEmail(): string { return this.email; }
  getCreatedAt(): string { return this.createdAt; }
}
