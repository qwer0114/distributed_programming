import { Candle } from '../coin/candle.entity';
import { Coin } from '../coin/coin.entity';
import { OrderBook, OrderBookUnit } from '../coin/order-book.entity';
import { Ticker } from '../coin/ticker.entity';
import { User } from './user.entity';

const UPBIT_BASE = 'https://api.upbit.com/v1';

interface UpbitMarketRaw {
  market: string;
  korean_name: string;
  english_name: string;
  market_warning?: string;
}

interface UpbitTickerRaw {
  market: string;
  trade_price: number;
  opening_price: number;
  high_price: number;
  low_price: number;
  prev_closing_price: number;
  change: string;
  change_rate: number;
  acc_trade_volume_24h: number;
  trade_timestamp: number;
}

interface UpbitCandleRaw {
  market: string;
  candle_date_time_kst: string;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  candle_acc_trade_volume: number;
  unit?: number;
}

interface UpbitOrderbookRaw {
  market: string;
  timestamp: number;
  total_ask_size: number;
  total_bid_size: number;
  orderbook_units: { ask_price: number; ask_size: number; bid_price: number; bid_size: number }[];
}

export class NonMember extends User {
  constructor(userId: string, nickname: string) {
    super(userId, nickname);
  }

  async viewCoinList(): Promise<Coin[]> {
    const markets = await fetch(`${UPBIT_BASE}/market/all?isDetails=false`).then(r => r.json()) as UpbitMarketRaw[];
    return markets
      .filter(m => m.market.startsWith('KRW-'))
      .map(m => new Coin(m.market, m.korean_name, m.english_name, m.market_warning ?? 'NONE'));
  }

  searchCoin(coins: Coin[], query: string): Coin | null {
    const q = query.toLowerCase();
    return coins.find(c =>
      c.getKoreanName().includes(query) ||
      c.getEnglishName().toLowerCase().includes(q) ||
      c.getMarketCode().toLowerCase().includes(q),
    ) ?? null;
  }

  async viewChart(market: string, unit: number, count: number = 200): Promise<Candle[]> {
    const raw = await fetch(
      `${UPBIT_BASE}/candles/minutes/${unit}?market=${market}&count=${count}`,
    ).then(r => r.json()) as UpbitCandleRaw[];
    return raw.map(c => new Candle(
      c.market,
      c.candle_date_time_kst,
      c.opening_price,
      c.high_price,
      c.low_price,
      c.trade_price,
      c.candle_acc_trade_volume,
      c.unit ?? unit,
    ));
  }

  async viewOrderBook(market: string): Promise<OrderBook> {
    const raw = await fetch(`${UPBIT_BASE}/orderbook?markets=${market}`).then(r => r.json()) as UpbitOrderbookRaw[];
    const ob = raw[0];
    const units = ob.orderbook_units.map(u => new OrderBookUnit(u.ask_price, u.ask_size, u.bid_price, u.bid_size));
    return new OrderBook(ob.market, ob.timestamp, ob.total_ask_size, ob.total_bid_size, units);
  }

  async getTicker(market: string): Promise<Ticker> {
    const raw = await fetch(`${UPBIT_BASE}/ticker?markets=${market}`).then(r => r.json()) as UpbitTickerRaw[];
    const t = raw[0];
    return new Ticker(t.market, t.trade_price, t.opening_price, t.high_price, t.low_price, t.prev_closing_price, t.change, t.change_rate, t.acc_trade_volume_24h, t.trade_timestamp);
  }
}
