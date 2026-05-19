import { Coin } from './domain/coin/coin.entity';
import { OrderBook, OrderBookUnit } from './domain/coin/order-book.entity';
import { Member } from './domain/user/member.entity';
import { NonMember } from './domain/user/non-member.entity';

// ─── Upbit REST API Raw Types ─────────────────────────────────────────────────

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

// ─── Mock Data (Upbit API 미접근 환경 폴백) ────────────────────────────────────

const MOCK_MARKETS = [
  { market: 'KRW-BTC', korean_name: '비트코인', english_name: 'Bitcoin', market_warning: 'NONE' },
  { market: 'KRW-ETH', korean_name: '이더리움', english_name: 'Ethereum', market_warning: 'NONE' },
  { market: 'KRW-XRP', korean_name: '리플', english_name: 'Ripple', market_warning: 'NONE' },
  { market: 'KRW-SOL', korean_name: '솔라나', english_name: 'Solana', market_warning: 'NONE' },
  { market: 'KRW-DOGE', korean_name: '도지코인', english_name: 'Dogecoin', market_warning: 'CAUTION' },
];

function makeMockTicker(market: string, basePrice: number): UpbitTickerRaw {
  return {
    market,
    trade_price: basePrice,
    opening_price: basePrice * 0.98,
    high_price: basePrice * 1.03,
    low_price: basePrice * 0.96,
    prev_closing_price: basePrice * 0.982,
    change: 'RISE',
    change_rate: 0.0185,
    acc_trade_volume_24h: 1234.567,
    trade_timestamp: Date.now(),
  };
}

const MOCK_TICKERS: Record<string, UpbitTickerRaw> = {
  'KRW-BTC': makeMockTicker('KRW-BTC', 145_320_000),
  'KRW-ETH': makeMockTicker('KRW-ETH', 5_234_000),
  'KRW-XRP': makeMockTicker('KRW-XRP', 850),
  'KRW-SOL': makeMockTicker('KRW-SOL', 312_000),
  'KRW-DOGE': makeMockTicker('KRW-DOGE', 520),
};

function makeMockCandles(market: string, unit: number, count: number): UpbitCandleRaw[] {
  const base = MOCK_TICKERS[market]?.trade_price ?? 100_000;
  return Array.from({ length: count }, (_, i) => {
    const t = new Date(Date.now() - i * unit * 60_000);
    const kst = t.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '').replace('Z', '');
    return {
      market,
      candle_date_time_kst: kst,
      opening_price: base * (1 - 0.01 * i),
      high_price: base * (1 + 0.005),
      low_price: base * (1 - 0.015),
      trade_price: base * (1 - 0.008 * i),
      candle_acc_trade_volume: 10 + i,
      unit,
    };
  });
}

function makeMockOrderbook(market: string): UpbitOrderbookRaw {
  const base = MOCK_TICKERS[market]?.trade_price ?? 100_000;
  return {
    market,
    timestamp: Date.now(),
    total_ask_size: 5.432,
    total_bid_size: 7.891,
    orderbook_units: Array.from({ length: 5 }, (_, i) => ({
      ask_price: base + (i + 1) * 1_000,
      ask_size: 0.5 - i * 0.05,
      bid_price: base - (i + 1) * 1_000,
      bid_size: 0.6 - i * 0.05,
    })),
  };
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

const BASE = 'https://api.upbit.com/v1';
let usingMock = false;

async function upbitGet<T>(path: string, mockFn: () => T): Promise<T> {
  if (usingMock) return mockFn();
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch {
    if (!usingMock) {
      usingMock = true;
      console.log('  ⚠️  Upbit API 접근 불가 → 목(mock) 데이터로 대체합니다.\n');
    }
    return mockFn();
  }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

function header(label: string): void {
  console.log('\n' + '═'.repeat(52));
  console.log(label);
  console.log('═'.repeat(52));
}

// ─── UseCase Scenarios ────────────────────────────────────────────────────────

async function runUC1(guest: NonMember): Promise<Coin[]> {
  header('[UC1] 코인 목록 조회');

  let coins: Coin[];
  try {
    coins = await guest.viewCoinList();
  } catch {
    if (!usingMock) {
      usingMock = true;
      console.log('  ⚠️  Upbit API 접근 불가 → 목(mock) 데이터로 대체합니다.\n');
    }
    coins = MOCK_MARKETS.map(m => new Coin(m.market, m.korean_name, m.english_name, m.market_warning));
  }

  const top5Markets = coins.slice(0, 5).map(c => c.getMarketCode()).join(',');
  const tickers = await upbitGet<UpbitTickerRaw[]>(
    `/ticker?markets=${top5Markets}`,
    () => coins.slice(0, 5).map(c => MOCK_TICKERS[c.getMarketCode()] ?? makeMockTicker(c.getMarketCode(), 10_000)),
  );

  const coinMap = new Map(coins.map(c => [c.getMarketCode(), c]));
  tickers.forEach((t, i) => {
    const coin = coinMap.get(t.market);
    if (!coin) return;
    const sign = t.change === 'FALL' ? '-' : t.change === 'RISE' ? '+' : '';
    console.log(
      `  ${i + 1}. ${coin.getKoreanName()} (${t.market})  ` +
      `현재가: ${fmt(t.trade_price)}원  등락률: ${sign}${(t.change_rate * 100).toFixed(2)}%`,
    );
  });

  console.log(`\n  ✅ 총 ${coins.length}개 KRW 마켓 조회 완료`);
  return coins;
}

async function runUC2_normal(guest: NonMember, coins: Coin[]): Promise<void> {
  header('[UC2] 코인 검색 — 정상: "비트코인" 검색');

  const result = guest.searchCoin(coins, '비트코인');
  console.log('  검색어: "비트코인"');
  if (result) {
    console.log(`  결과: ${result.getKoreanName()} (${result.getMarketCode()}) — ${result.getEnglishName()}`);
    console.log('  ✅ 완료');
  }
}

async function runUC2_A1(guest: NonMember, coins: Coin[]): Promise<void> {
  header('[UC2-A1] 코인 검색 — 결과 없음');

  const result = guest.searchCoin(coins, '없는코인XYZ');
  console.log('  검색어: "없는코인XYZ"');
  if (!result) {
    console.log('  ❌ 검색 결과가 없습니다.');
  }
}

async function runUC3_normal(guest: NonMember): Promise<void> {
  header('[UC3] 차트 조회 — 정상: KRW-BTC 1분봉 5개');

  let candles;
  try {
    candles = await guest.viewChart('KRW-BTC', 1, 5);
  } catch {
    const { Candle } = await import('./domain/coin/candle.entity');
    candles = makeMockCandles('KRW-BTC', 1, 5).map(c =>
      new Candle(c.market, c.candle_date_time_kst, c.opening_price, c.high_price, c.low_price, c.trade_price, c.candle_acc_trade_volume, c.unit ?? 1),
    );
  }

  candles.forEach((c, i) => {
    console.log(
      `  ${i + 1}. [${c.getCandleDateTimeKst()}] ` +
      `시${fmt(c.getOpeningPrice())} 고${fmt(c.getHighPrice())} ` +
      `저${fmt(c.getLowPrice())} 종${fmt(c.getTradePrice())}`,
    );
  });
  console.log('  ✅ 완료');
}

async function runUC3_A1(guest: NonMember): Promise<void> {
  header('[UC3-A1] 차트 조회 — 기간 변경: KRW-BTC 60분봉 5개');

  let candles;
  try {
    candles = await guest.viewChart('KRW-BTC', 60, 5);
  } catch {
    const { Candle } = await import('./domain/coin/candle.entity');
    candles = makeMockCandles('KRW-BTC', 60, 5).map(c =>
      new Candle(c.market, c.candle_date_time_kst, c.opening_price, c.high_price, c.low_price, c.trade_price, c.candle_acc_trade_volume, c.unit ?? 60),
    );
  }

  candles.forEach((c, i) => {
    console.log(
      `  ${i + 1}. [${c.getCandleDateTimeKst()}] ` +
      `시${fmt(c.getOpeningPrice())} 고${fmt(c.getHighPrice())} ` +
      `저${fmt(c.getLowPrice())} 종${fmt(c.getTradePrice())} (${c.getUnit()}분봉)`,
    );
  });
  console.log('  ✅ 완료');
}

async function runUC4(guest: NonMember): Promise<void> {
  header('[UC4] 호가 조회 — KRW-BTC');

  let ob;
  try {
    ob = await guest.viewOrderBook('KRW-BTC');
  } catch {
    const raw = makeMockOrderbook('KRW-BTC');
    const units = raw.orderbook_units.map(u => new OrderBookUnit(u.ask_price, u.ask_size, u.bid_price, u.bid_size));
    ob = new OrderBook(raw.market, raw.timestamp, raw.total_ask_size, raw.total_bid_size, units);
  }

  const units = ob.getUnits().slice(0, 3);
  console.log(`  마켓: ${ob.getMarket()}  매도잔량: ${ob.getTotalAskSize().toFixed(4)}  매수잔량: ${ob.getTotalBidSize().toFixed(4)}`);
  console.log('  ─────────────────────────────────────────────');
  console.log('    매도 호가              │  매수 호가');
  console.log('  ─────────────────────────────────────────────');
  units.forEach(u => {
    console.log(
      `    ${fmt(u.getAskPrice())}원 (${u.getAskSize().toFixed(4)})  │  ${fmt(u.getBidPrice())}원 (${u.getBidSize().toFixed(4)})`,
    );
  });
  console.log('  ─────────────────────────────────────────────');
  console.log(`  스프레드: ${fmt(ob.getSpread())}원`);
  console.log('  ✅ 완료');
}

async function runUC7_normal(member: Member): Promise<void> {
  header('[UC7] 자산 충전 — 정상: 100,000원 충전');

  const before = member.getWallet().getBalance();
  member.charge(100_000);
  const after = member.getWallet().getBalance();
  console.log(`  충전 전: ${fmt(before)}원`);
  console.log(`  충전 금액: 100,000원`);
  console.log(`  충전 후: ${fmt(after)}원`);
  console.log('  ✅ 완료');
}

async function runUC7_A1(member: Member): Promise<void> {
  header('[UC7-A1] 자산 충전 — 최소금액 미만: 1,000원 충전 시도');

  try {
    member.charge(1_000);
  } catch (e) {
    console.log('  충전 시도: 1,000원');
    console.log(`  ❌ 오류: ${(e as Error).message}`);
  }
}

async function runUC5_normal(member: Member): Promise<void> {
  header('[UC5] 매수 — 정상: KRW-BTC 0.0001 BTC 매수');

  const tickers = await upbitGet<UpbitTickerRaw[]>(
    '/ticker?markets=KRW-BTC',
    () => [MOCK_TICKERS['KRW-BTC']],
  );
  const currentPrice = tickers[0].trade_price;
  const volume = 0.0001;
  const required = currentPrice * volume;

  console.log(`  현재가: ${fmt(currentPrice)}원`);
  console.log(`  주문 수량: ${volume} BTC  필요금액: ${fmt(required)}원`);
  console.log(`  주문 전 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);

  const history = member.buyCoin('KRW-BTC', volume, currentPrice);

  console.log(`  주문 후 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);
  console.log(`  거래 ID: ${history.getUuid()}  수수료: ${history.getPaidFee().toFixed(0)}원`);
  console.log('  ✅ 완료');
}

async function runUC5_A1(member: Member): Promise<void> {
  header('[UC5-A1] 매수 — 잔액 부족: KRW-BTC 10 BTC 매수 시도');

  const tickers = await upbitGet<UpbitTickerRaw[]>(
    '/ticker?markets=KRW-BTC',
    () => [MOCK_TICKERS['KRW-BTC']],
  );
  const currentPrice = tickers[0].trade_price;

  try {
    member.buyCoin('KRW-BTC', 10, currentPrice);
  } catch (e) {
    console.log(`  주문 시도: 10 BTC (필요금액 ${fmt(currentPrice * 10)}원)`);
    console.log(`  현재 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);
    console.log(`  ❌ 오류: ${(e as Error).message}`);
  }
}

async function runUC5_A2(member: Member): Promise<void> {
  header('[UC5-A2] 매수 — 최소수량 미만: 0.00001 BTC 매수 시도');

  try {
    member.buyCoin('KRW-BTC', 0.00001, 100_000_000);
  } catch (e) {
    console.log('  주문 시도: 0.00001 BTC (최소 0.0001 미만)');
    console.log(`  ❌ 오류: ${(e as Error).message}`);
  }
}

async function runUC8_UC16(member: Member): Promise<void> {
  header('[UC8] 보유코인 조회 → [UC16] 손익분석');

  const portfolio = member.viewPortfolio();
  const holdings = portfolio.holdings;

  if (holdings.length === 0) {
    console.log('  보유 중인 코인이 없습니다.');
    return;
  }

  const tickers = await upbitGet<UpbitTickerRaw[]>(
    '/ticker?markets=KRW-BTC',
    () => [MOCK_TICKERS['KRW-BTC']],
  );
  const currentPrice = tickers[0].trade_price;
  const prices = new Map<string, number>([['KRW-BTC', currentPrice]]);

  console.log('  ─ 보유코인 목록 ─');
  holdings.forEach(h => {
    const evalAmt = h.getEvalAmount(currentPrice);
    const profitRate = h.getProfitRate(currentPrice);
    const sign = profitRate >= 0 ? '+' : '';
    console.log(
      `  ${h.currency}: ${h.balance} 개 | 평균매수가 ${fmt(h.avgBuyPrice)}원 | ` +
      `현재가 ${fmt(currentPrice)}원 | 평가금액 ${fmt(evalAmt)}원 | 수익률 ${sign}${profitRate.toFixed(2)}%`,
    );
  });

  portfolio.analyzeProfit(prices);
  console.log('  ✅ 완료');
}

async function runUC6_normal(member: Member): Promise<void> {
  header('[UC6] 매도 — 정상: 보유 BTC 전량 매도');

  const portfolio = member.viewPortfolio();
  const holding = portfolio.getHolding('BTC');
  if (!holding) {
    console.log('  보유 BTC가 없습니다. (UC5 매수가 선행되어야 함)');
    return;
  }

  const tickers = await upbitGet<UpbitTickerRaw[]>(
    '/ticker?markets=KRW-BTC',
    () => [MOCK_TICKERS['KRW-BTC']],
  );
  const currentPrice = tickers[0].trade_price;
  const volume = holding.balance;

  console.log(`  매도 수량: ${volume} BTC  현재가: ${fmt(currentPrice)}원`);
  console.log(`  매도 전 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);

  const history = member.sellCoin('KRW-BTC', volume, currentPrice);

  console.log(`  매도 후 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);
  console.log(`  수수료: ${history.getPaidFee().toFixed(0)}원`);
  console.log('  ✅ 완료');
}

async function runUC6_A1(member: Member): Promise<void> {
  header('[UC6-A1] 매도 — 보유량 부족: KRW-BTC 100 BTC 매도 시도');

  const tickers = await upbitGet<UpbitTickerRaw[]>(
    '/ticker?markets=KRW-BTC',
    () => [MOCK_TICKERS['KRW-BTC']],
  );
  const currentPrice = tickers[0].trade_price;

  try {
    member.sellCoin('KRW-BTC', 100, currentPrice);
  } catch (e) {
    console.log('  매도 시도: 100 BTC');
    console.log(`  ❌ 오류: ${(e as Error).message}`);
  }
}

async function runUC9(member: Member): Promise<void> {
  header('[UC9] 거래내역 조회');

  const histories = member.viewTradeHistory();
  if (histories.length === 0) {
    console.log('  거래내역이 없습니다.');
    return;
  }

  console.log(`  전체 거래내역 (${histories.length}건):`);
  histories.forEach((h, i) => {
    const side = h.getSide() === 'bid' ? '매수' : '매도';
    console.log(
      `  ${i + 1}. [${side}] ${h.getMarket()} | 수량: ${h.getVolume()} | ` +
      `가격: ${fmt(h.getPrice())}원 | 수수료: ${h.getPaidFee().toFixed(0)}원 | ${h.getCreatedAt()}`,
    );
  });

  // A1: 기간 변경 — 최근 1시간 필터
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recent = histories.filter(h => new Date(h.getCreatedAt()).getTime() >= oneHourAgo);
  console.log(`\n  [A1] 최근 1시간 거래내역 (${recent.length}건):`);
  recent.forEach((h, i) => {
    const side = h.getSide() === 'bid' ? '매수' : '매도';
    console.log(`  ${i + 1}. [${side}] ${h.getMarket()} | 수량: ${h.getVolume()} | ${h.getCreatedAt()}`);
  });

  console.log('  ✅ 완료');
}

async function runUC10(member: Member): Promise<void> {
  header('[UC10] 보유 자산 조회');

  const wallet = member.getWallet();
  console.log(`  통화: ${wallet.getCurrency()}`);
  console.log(`  총 잔액: ${fmt(wallet.getBalance())}원`);
  console.log(`  묶인 금액: ${fmt(wallet.getLocked())}원`);
  console.log(`  사용 가능 잔액: ${fmt(wallet.getAvailableBalance())}원`);
  console.log('  ✅ 완료');
}

async function runUC11(member: Member, coins: Coin[]): Promise<void> {
  header('[UC11] 즐겨찾기 등록/해제');

  const watchlist = member.getWatchlist();
  const btc = coins.find(c => c.getMarketCode() === 'KRW-BTC')!;

  // 정상: 등록
  watchlist.addCoin(btc);
  console.log(`  ✅ 즐겨찾기 등록: ${btc.getKoreanName()} (${btc.getMarketCode()})`);
  console.log(`  현재 즐겨찾기: [${watchlist.getCoinList().map(c => c.getMarketCode()).join(', ')}]`);

  // A1: 이미 등록된 코인 재등록 시도
  try {
    watchlist.addCoin(btc);
  } catch (e) {
    console.log(`\n  [A1] 재등록 시도: ${btc.getMarketCode()}`);
    console.log(`  ❌ 오류: ${(e as Error).message}`);
  }

  // 제거
  watchlist.removeCoin('KRW-BTC');
  console.log(`\n  ✅ 즐겨찾기 제거: KRW-BTC`);
  console.log(`  현재 즐겨찾기: [${watchlist.getCoinList().map(c => c.getMarketCode()).join(', ') || '비어 있음'}]`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n' + '█'.repeat(52));
  console.log('  업비트 모의 투자 — UseCase 시나리오 데모');
  console.log('█'.repeat(52));

  const guest = new NonMember('guest-001', '비회원');
  const member = new Member('user-001', '테스트회원', 'test@example.com', 'password123');

  // 공개 UseCase (비회원)
  const coins = await runUC1(guest);
  await runUC2_normal(guest, coins);
  await runUC2_A1(guest, coins);
  await runUC3_normal(guest);
  await runUC3_A1(guest);
  await runUC4(guest);

  // 인증 UseCase (회원)
  await runUC7_normal(member);
  await runUC7_A1(member);
  await runUC5_normal(member);
  await runUC5_A1(member);
  await runUC5_A2(member);
  await runUC8_UC16(member);
  await runUC6_normal(member);
  await runUC6_A1(member);
  await runUC9(member);
  await runUC10(member);
  await runUC11(member, coins);

  console.log('\n' + '█'.repeat(52));
  console.log('  모든 UseCase 시나리오 완료');
  console.log('█'.repeat(52) + '\n');
}

main().catch(console.error);
