// ─────────────────────────────────────────────────────────────
// 클래스 13: 즐겨찾기 (Watchlist)
//
// 회원의 관심 코인 목록.
// 회원 계정에 Composition으로 종속됩니다.
//
// Association ↔ Coin (N:M)
//   한 Watchlist에 여러 Coin, 한 Coin은 여러 Watchlist에 등록 가능
// ─────────────────────────────────────────────────────────────

import { Coin } from './05.coin';

export class Watchlist {
  private watchlistId: number; // 즐겨찾기 목록 고유 식별자
  private createdAt: string;
  private coins: Coin[] = []; // Association ↔ Coin (N:M)

  constructor(watchlistId: number = 1) {
    this.watchlistId = watchlistId;
    this.createdAt   = new Date().toISOString();
  }

  // UC11: 즐겨찾기에 코인 추가 — 이미 있으면 에러
  addCoin(coin: Coin): void {
    const exists = this.coins.find(c => c.getMarketCode() === coin.getMarketCode());
    if (exists) {
      throw new Error(`이미 즐겨찾기에 추가된 코인입니다: ${coin.getMarketCode()}`);
    }
    this.coins.push(coin);
  }

  // UC11-A1: 즐겨찾기에서 코인 제거 — 없으면 에러
  removeCoin(market: string): void {
    const idx = this.coins.findIndex(c => c.getMarketCode() === market);
    if (idx === -1) {
      throw new Error(`즐겨찾기에 없는 코인입니다: ${market}`);
    }
    this.coins.splice(idx, 1);
  }

  // 즐겨찾기 코인 목록 반환
  getCoinList(): Coin[] { return [...this.coins]; }

  // 특정 코인이 즐겨찾기에 있는지 확인
  has(market: string): boolean {
    return this.coins.some(c => c.getMarketCode() === market);
  }

  // 등록/해제 토글 (편의 메서드)
  toggle(coin: Coin): boolean {
    if (this.has(coin.getMarketCode())) {
      this.removeCoin(coin.getMarketCode());
      return false; // 제거됨
    } else {
      this.addCoin(coin);
      return true; // 추가됨
    }
  }

  getWatchlistId(): number { return this.watchlistId; }
  getCreatedAt(): string   { return this.createdAt; }

  // DB 로드용 — 중복 체크 없이 직접 추가
  loadCoin(coin: Coin): void {
    this.coins.push(coin);
  }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const watchlist = new Watchlist();
// const btc = new Coin('KRW-BTC', '비트코인', 'Bitcoin', 'NONE');
// const eth = new Coin('KRW-ETH', '이더리움', 'Ethereum', 'NONE');
//
// watchlist.addCoin(btc);
// watchlist.addCoin(eth);
// watchlist.getCoinList().length;  // 2
//
// watchlist.addCoin(btc);          // ❌ Error: 이미 즐겨찾기에 추가된 코인
// watchlist.toggle(btc);           // false → 제거됨
// watchlist.getCoinList().length;  // 1
