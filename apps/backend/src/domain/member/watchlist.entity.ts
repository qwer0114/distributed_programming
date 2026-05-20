import { Coin } from '../coin/coin.entity';

export class Watchlist {
  private watchlistId: number;
  private createdAt: string;
  private coins: Coin[] = [];

  constructor(watchlistId: number = 1) {
    this.watchlistId = watchlistId;
    this.createdAt = new Date().toISOString();
  }

  addCoin(coin: Coin): void {
    const exists = this.coins.find(c => c.getMarketCode() === coin.getMarketCode());
    if (exists) {
      throw new Error(`이미 즐겨찾기에 추가된 코인입니다: ${coin.getMarketCode()}`);
    }
    this.coins.push(coin);
  }

  removeCoin(market: string): void {
    const idx = this.coins.findIndex(c => c.getMarketCode() === market);
    if (idx === -1) {
      throw new Error(`즐겨찾기에 없는 코인입니다: ${market}`);
    }
    this.coins.splice(idx, 1);
  }

  getCoinList(): Coin[] {
    return [...this.coins];
  }

  loadCoin(coin: Coin): void {
    this.coins.push(coin);
  }

  getWatchlistId(): number { return this.watchlistId; }
  getCreatedAt(): string { return this.createdAt; }
}
