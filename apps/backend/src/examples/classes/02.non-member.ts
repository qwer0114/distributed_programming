// ─────────────────────────────────────────────────────────────
// 클래스 2: 비회원 (NonMember)
//
// 로그인 없이 공개 기능만 이용하는 사용자.
// 업비트 API를 호출해서 코인 정보를 조회합니다.
// ─────────────────────────────────────────────────────────────

import { User }      from './01.user';
import { Coin }      from './05.coin';
import { Candle }    from './07.candle';
import { OrderBook, OrderBookUnit } from './08.order-book';

const UPBIT = 'https://api.upbit.com/v1';

export class NonMember extends User {
  constructor(userId: string, nickname: string) {
    super(userId, nickname);
  }

  // UC1: 코인 목록 조회 — 업비트 /market/all + /ticker 호출
  async viewCoinList(): Promise<Coin[]> {
    const markets = await fetch(`${UPBIT}/market/all?isDetails=false`).then(r => r.json()) as {
      market: string; korean_name: string; english_name: string; market_warning: string;
    }[];

    // KRW 마켓만 필터링
    const krwMarkets = markets.filter(m => m.market.startsWith('KRW-'));

    return krwMarkets.map(m => new Coin(m.market, m.korean_name, m.english_name, m.market_warning));
  }

  // UC2: 코인 검색 — 이름 또는 심볼로 검색 (API 호출 없음, 목록에서 필터)
  searchCoin(coins: Coin[], query: string): Coin | null {
    const q = query.toLowerCase();
    return coins.find(c =>
      c.getKoreanName().includes(query) ||
      c.getEnglishName().toLowerCase().includes(q) ||
      c.getMarketCode().toLowerCase().includes(q),
    ) ?? null;
  }

  // UC3: 차트 조회 — 업비트 /candles/minutes/{unit}
  async viewChart(market: string, unit: number, count: number): Promise<Candle[]> {
    const data = await fetch(
      `${UPBIT}/candles/minutes/${unit}?market=${market}&count=${count}`,
    ).then(r => r.json()) as {
      market: string; candle_date_time_kst: string;
      opening_price: number; high_price: number; low_price: number;
      trade_price: number; candle_acc_trade_volume: number; unit: number;
    }[];

    return data.map(c => new Candle(
      c.market, c.candle_date_time_kst,
      c.opening_price, c.high_price, c.low_price, c.trade_price,
      c.candle_acc_trade_volume, c.unit,
    ));
  }

  // UC4: 호가 조회 — 업비트 /orderbook
  async viewOrderBook(market: string): Promise<OrderBook> {
    const data = await fetch(`${UPBIT}/orderbook?markets=${market}`).then(r => r.json()) as {
      market: string; timestamp: number; total_ask_size: number; total_bid_size: number;
      orderbook_units: { ask_price: number; ask_size: number; bid_price: number; bid_size: number }[];
    }[];

    const raw = data[0];
    const units = raw.orderbook_units.map(u =>
      new OrderBookUnit(u.ask_price, u.ask_size, u.bid_price, u.bid_size),
    );
    return new OrderBook(raw.market, raw.timestamp, raw.total_ask_size, raw.total_bid_size, units);
  }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const guest = new NonMember('guest-1', '비회원');
// const coins = await guest.viewCoinList();
// const btc   = guest.searchCoin(coins, '비트코인');
// const chart = await guest.viewChart('KRW-BTC', 1, 5);
// const ob    = await guest.viewOrderBook('KRW-BTC');
