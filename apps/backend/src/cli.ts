// SSL inspection proxy 환경에서 인증서 검증 오류 우회 (개발/데모용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { Candle } from './domain/coin/candle.entity';
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
  { market: 'KRW-ADA', korean_name: '에이다', english_name: 'Cardano', market_warning: 'NONE' },
  { market: 'KRW-AVAX', korean_name: '아발란체', english_name: 'Avalanche', market_warning: 'NONE' },
];

const MOCK_PRICES: Record<string, number> = {
  'KRW-BTC': 145_320_000,
  'KRW-ETH': 5_234_000,
  'KRW-XRP': 850,
  'KRW-SOL': 312_000,
  'KRW-DOGE': 520,
  'KRW-ADA': 720,
  'KRW-AVAX': 48_000,
};

function makeMockTicker(market: string): UpbitTickerRaw {
  const basePrice = MOCK_PRICES[market] ?? 10_000;
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

function makeMockCandles(market: string, unit: number, count: number): UpbitCandleRaw[] {
  const base = MOCK_PRICES[market] ?? 100_000;
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
  const base = MOCK_PRICES[market] ?? 100_000;
  return {
    market,
    timestamp: Date.now(),
    total_ask_size: 5.432,
    total_bid_size: 7.891,
    orderbook_units: Array.from({ length: 15 }, (_, i) => ({
      ask_price: base + (i + 1) * 1_000,
      ask_size: Math.max(0.05, 0.5 - i * 0.03),
      bid_price: base - (i + 1) * 1_000,
      bid_size: Math.max(0.05, 0.6 - i * 0.03),
    })),
  };
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

const BASE = 'https://api.upbit.com/v1';
let usingMock = false;

async function tryFetch<T>(path: string): Promise<T | null> {
  if (usingMock) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch {
    if (!usingMock) {
      usingMock = true;
      console.log('\n  ⚠️  Upbit API 접근 불가 → mock 데이터로 동작합니다.');
    }
    return null;
  }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

// ─── CLI 상태 ─────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input, output });

const guest = new NonMember('guest-001', '비회원');
let loggedInMember: Member | null = null;
let cachedCoins: Coin[] | null = null;

async function getCoins(): Promise<Coin[]> {
  if (cachedCoins) return cachedCoins;
  try {
    cachedCoins = await guest.viewCoinList();
  } catch {
    if (!usingMock) {
      usingMock = true;
      console.log('  ⚠️  Upbit API 접근 불가 → mock 데이터로 동작합니다.');
    }
    cachedCoins = MOCK_MARKETS.map(m => new Coin(m.market, m.korean_name, m.english_name, m.market_warning));
  }
  return cachedCoins;
}

async function getPrice(market: string): Promise<number> {
  const data = await tryFetch<UpbitTickerRaw[]>(`/ticker?markets=${market}`);
  if (data && data[0]) return data[0].trade_price;
  return MOCK_PRICES[market] ?? makeMockTicker(market).trade_price;
}

// ─── UseCase 핸들러 ──────────────────────────────────────────────────────────

async function handleUC1(): Promise<void> {
  console.log('\n[UC1] 코인 목록 조회');
  const coins = await getCoins();
  const limit = Math.min(coins.length, 10);
  const top = coins.slice(0, limit);
  const codes = top.map(c => c.getMarketCode()).join(',');
  const raw = await tryFetch<UpbitTickerRaw[]>(`/ticker?markets=${codes}`);
  const tickers = raw ?? top.map(c => makeMockTicker(c.getMarketCode()));

  console.log(`\n  상위 ${limit}개 KRW 마켓:`);
  const coinMap = new Map(coins.map(c => [c.getMarketCode(), c]));
  tickers.forEach((t, i) => {
    const coin = coinMap.get(t.market);
    if (!coin) return;
    const sign = t.change === 'FALL' ? '-' : t.change === 'RISE' ? '+' : '';
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${coin.getKoreanName().padEnd(8)} (${t.market.padEnd(10)})  ` +
      `현재가: ${fmt(t.trade_price).padStart(14)}원  등락률: ${sign}${(t.change_rate * 100).toFixed(2)}%`,
    );
  });
  console.log(`\n  ✅ 총 ${coins.length}개 KRW 마켓`);
}

async function handleUC2(): Promise<void> {
  console.log('\n[UC2] 코인 검색');
  const query = (await rl.question('  검색어 (코인명/심볼): ')).trim();
  if (!query) {
    console.log('  검색어를 입력하지 않았습니다.');
    return;
  }
  const coins = await getCoins();
  const result = guest.searchCoin(coins, query);
  if (result) {
    console.log(`  ✅ 결과: ${result.getKoreanName()} (${result.getMarketCode()}) — ${result.getEnglishName()}`);
  } else {
    console.log(`  ❌ "${query}"에 해당하는 검색 결과가 없습니다.`);
  }
}

async function handleUC3(): Promise<void> {
  console.log('\n[UC3] 차트 조회');
  const market = (await rl.question('  마켓 코드 (예: KRW-BTC) [기본: KRW-BTC]: ')).trim() || 'KRW-BTC';
  const unitStr = (await rl.question('  분봉 단위 (1/3/5/15/30/60/240) [기본: 1]: ')).trim() || '1';
  const countStr = (await rl.question('  조회 개수 [기본: 5]: ')).trim() || '5';
  const unit = parseInt(unitStr, 10);
  const count = parseInt(countStr, 10);

  let candles: Candle[];
  try {
    candles = await guest.viewChart(market, unit, count);
  } catch {
    candles = makeMockCandles(market, unit, count).map(c =>
      new Candle(c.market, c.candle_date_time_kst, c.opening_price, c.high_price, c.low_price, c.trade_price, c.candle_acc_trade_volume, c.unit ?? unit),
    );
  }

  console.log(`\n  ${market} ${unit}분봉 ${candles.length}개:`);
  candles.forEach((c, i) => {
    console.log(
      `  ${(i + 1).toString().padStart(2)}. [${c.getCandleDateTimeKst()}]  ` +
      `시${fmt(c.getOpeningPrice())} 고${fmt(c.getHighPrice())} 저${fmt(c.getLowPrice())} 종${fmt(c.getTradePrice())}`,
    );
  });
}

async function handleUC4(): Promise<void> {
  console.log('\n[UC4] 호가 조회');
  const market = (await rl.question('  마켓 코드 [기본: KRW-BTC]: ')).trim() || 'KRW-BTC';

  let ob: OrderBook;
  try {
    ob = await guest.viewOrderBook(market);
  } catch {
    const raw = makeMockOrderbook(market);
    const units = raw.orderbook_units.map(u => new OrderBookUnit(u.ask_price, u.ask_size, u.bid_price, u.bid_size));
    ob = new OrderBook(raw.market, raw.timestamp, raw.total_ask_size, raw.total_bid_size, units);
  }

  console.log(`\n  ${ob.getMarket()}  매도잔량: ${ob.getTotalAskSize().toFixed(4)}  매수잔량: ${ob.getTotalBidSize().toFixed(4)}`);
  console.log('  ─────────────────────────────────────────────────');
  console.log('       매도 호가              매수 호가');
  console.log('  ─────────────────────────────────────────────────');
  ob.getUnits().slice(0, 5).forEach(u => {
    console.log(
      `   ${fmt(u.getAskPrice()).padStart(12)}원 (${u.getAskSize().toFixed(4)})  ` +
      `${fmt(u.getBidPrice()).padStart(12)}원 (${u.getBidSize().toFixed(4)})`,
    );
  });
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  스프레드: ${fmt(ob.getSpread())}원`);
}

async function handleLogin(): Promise<void> {
  if (loggedInMember) {
    console.log(`\n  이미 로그인되어 있습니다: ${loggedInMember.getNickname()}`);
    return;
  }
  console.log('\n[로그인]');
  const email = (await rl.question('  이메일 [기본: test@example.com]: ')).trim() || 'test@example.com';
  const nickname = email.split('@')[0];
  loggedInMember = new Member(`user-${Date.now()}`, nickname, email, 'password123');
  loggedInMember.login();
  console.log(`  ✅ 로그인 성공: ${nickname} (${email})`);
}

async function handleLogout(): Promise<void> {
  if (!loggedInMember) {
    console.log('\n  로그인 상태가 아닙니다.');
    return;
  }
  console.log(`\n  ✅ 로그아웃: ${loggedInMember.getNickname()}`);
  loggedInMember.logout();
  loggedInMember = null;
}

function requireMember(): Member | null {
  if (!loggedInMember) {
    console.log('\n  ❌ 로그인이 필요합니다. (메뉴 5: 로그인)');
    return null;
  }
  return loggedInMember;
}

async function handleUC7(): Promise<void> {
  const member = requireMember();
  if (!member) return;
  console.log('\n[UC7] 자산 충전');
  const amountStr = (await rl.question('  충전 금액 (KRW): ')).trim();
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    console.log('  ❌ 올바른 금액을 입력해주세요.');
    return;
  }
  try {
    const before = member.getWallet().getBalance();
    member.charge(amount);
    console.log(`  ✅ 충전 완료: ${fmt(before)}원 → ${fmt(member.getWallet().getBalance())}원`);
  } catch (e) {
    console.log(`  ❌ 오류: ${(e as Error).message}`);
  }
}

async function handleUC5(): Promise<void> {
  const member = requireMember();
  if (!member) return;
  console.log('\n[UC5] 코인 매수');
  const market = (await rl.question('  마켓 코드 [기본: KRW-BTC]: ')).trim() || 'KRW-BTC';
  const volumeStr = (await rl.question('  매수 수량: ')).trim();
  const volume = parseFloat(volumeStr);
  if (isNaN(volume) || volume <= 0) {
    console.log('  ❌ 올바른 수량을 입력해주세요.');
    return;
  }

  const currentPrice = await getPrice(market);
  console.log(`\n  현재가: ${fmt(currentPrice)}원  필요금액: ${fmt(currentPrice * volume)}원`);
  console.log(`  주문 전 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);

  try {
    const history = member.buyCoin(market, volume, currentPrice);
    console.log(`  ✅ 매수 완료`);
    console.log(`  주문 후 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);
    console.log(`  거래 ID: ${history.getUuid()}  수수료: ${history.getPaidFee().toFixed(0)}원`);
  } catch (e) {
    console.log(`  ❌ 오류: ${(e as Error).message}`);
  }
}

async function handleUC6(): Promise<void> {
  const member = requireMember();
  if (!member) return;
  console.log('\n[UC6] 코인 매도');
  const market = (await rl.question('  마켓 코드 [기본: KRW-BTC]: ')).trim() || 'KRW-BTC';
  const volumeStr = (await rl.question('  매도 수량 (all: 전량): ')).trim();

  const currency = market.replace('KRW-', '');
  const holding = member.viewPortfolio().getHolding(currency);
  let volume: number;
  if (volumeStr.toLowerCase() === 'all') {
    if (!holding) {
      console.log('  ❌ 보유 중인 코인이 없습니다.');
      return;
    }
    volume = holding.balance;
  } else {
    volume = parseFloat(volumeStr);
    if (isNaN(volume) || volume <= 0) {
      console.log('  ❌ 올바른 수량을 입력해주세요.');
      return;
    }
  }

  const currentPrice = await getPrice(market);
  console.log(`\n  매도 수량: ${volume}  현재가: ${fmt(currentPrice)}원`);
  console.log(`  매도 전 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);

  try {
    const history = member.sellCoin(market, volume, currentPrice);
    console.log(`  ✅ 매도 완료`);
    console.log(`  매도 후 잔액: ${fmt(member.getWallet().getAvailableBalance())}원`);
    console.log(`  수수료: ${history.getPaidFee().toFixed(0)}원`);
  } catch (e) {
    console.log(`  ❌ 오류: ${(e as Error).message}`);
  }
}

async function handleUC8(): Promise<void> {
  const member = requireMember();
  if (!member) return;
  console.log('\n[UC8] 보유코인 조회 + [UC16] 손익분석');

  const portfolio = member.viewPortfolio();
  const holdings = portfolio.holdings;
  if (holdings.length === 0) {
    console.log('  보유 중인 코인이 없습니다.');
    return;
  }

  // 각 보유 코인의 현재가 조회
  const prices = new Map<string, number>();
  for (const h of holdings) {
    const market = `KRW-${h.currency}`;
    prices.set(market, await getPrice(market));
  }

  console.log('\n  ─ 보유코인 ─');
  holdings.forEach(h => {
    const market = `KRW-${h.currency}`;
    const price = prices.get(market)!;
    const evalAmt = h.getEvalAmount(price);
    const rate = h.getProfitRate(price);
    const sign = rate >= 0 ? '+' : '';
    console.log(
      `  ${h.currency}: ${h.balance} 개 | 평균매수가 ${fmt(h.avgBuyPrice)}원 | ` +
      `현재가 ${fmt(price)}원 | 평가금액 ${fmt(evalAmt)}원 | 수익률 ${sign}${rate.toFixed(2)}%`,
    );
  });

  const ans = (await rl.question('\n  손익분석 상세를 보시겠습니까? (y/N): ')).trim().toLowerCase();
  if (ans === 'y') {
    portfolio.analyzeProfit(prices);
  }
}

async function handleUC9(): Promise<void> {
  const member = requireMember();
  if (!member) return;
  console.log('\n[UC9] 거래내역 조회');

  const histories = member.viewTradeHistory();
  if (histories.length === 0) {
    console.log('  거래내역이 없습니다.');
    return;
  }

  const filterStr = (await rl.question('  기간 필터 (전체: 그냥 Enter, 1h/24h/7d): ')).trim();
  let filtered = histories;
  if (filterStr) {
    const ms = parseDuration(filterStr);
    if (ms === null) {
      console.log('  ❌ 잘못된 기간 형식. (예: 1h, 24h, 7d)');
      return;
    }
    const since = Date.now() - ms;
    filtered = histories.filter(h => new Date(h.getCreatedAt()).getTime() >= since);
    console.log(`\n  최근 ${filterStr} 거래내역 (${filtered.length}건):`);
  } else {
    console.log(`\n  전체 거래내역 (${filtered.length}건):`);
  }

  filtered.forEach((h, i) => {
    const side = h.getSide() === 'bid' ? '매수' : '매도';
    console.log(
      `  ${i + 1}. [${side}] ${h.getMarket()} | 수량: ${h.getVolume()} | ` +
      `가격: ${fmt(h.getPrice())}원 | 수수료: ${h.getPaidFee().toFixed(0)}원 | ${h.getCreatedAt()}`,
    );
  });
}

function parseDuration(s: string): number | null {
  const m = s.match(/^(\d+)([hd])$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return m[2].toLowerCase() === 'h' ? n * 3600_000 : n * 86_400_000;
}

async function handleUC10(): Promise<void> {
  const member = requireMember();
  if (!member) return;
  console.log('\n[UC10] 보유 자산 조회');
  const w = member.getWallet();
  console.log(`  통화: ${w.getCurrency()}`);
  console.log(`  총 잔액: ${fmt(w.getBalance())}원`);
  console.log(`  묶인 금액: ${fmt(w.getLocked())}원`);
  console.log(`  사용 가능 잔액: ${fmt(w.getAvailableBalance())}원`);
}

async function handleUC11(): Promise<void> {
  const member = requireMember();
  if (!member) return;
  console.log('\n[UC11] 즐겨찾기 등록/해제');

  const watchlist = member.getWatchlist();
  console.log(`  현재 즐겨찾기 (${watchlist.getCoinList().length}개): [${watchlist.getCoinList().map(c => c.getMarketCode()).join(', ') || '비어 있음'}]`);

  const market = (await rl.question('  토글할 마켓 코드 (예: KRW-BTC): ')).trim();
  if (!market) {
    console.log('  취소되었습니다.');
    return;
  }

  const coins = await getCoins();
  const coin = coins.find(c => c.getMarketCode() === market);
  if (!coin) {
    console.log(`  ❌ 존재하지 않는 마켓 코드: ${market}`);
    return;
  }

  const alreadyAdded = watchlist.getCoinList().some(c => c.getMarketCode() === market);
  if (alreadyAdded) {
    watchlist.removeCoin(market);
    console.log(`  ✅ 즐겨찾기에서 제거: ${coin.getKoreanName()} (${market})`);
  } else {
    watchlist.addCoin(coin);
    console.log(`  ✅ 즐겨찾기에 추가: ${coin.getKoreanName()} (${market})`);
  }

  console.log(`  현재 즐겨찾기: [${watchlist.getCoinList().map(c => c.getMarketCode()).join(', ') || '비어 있음'}]`);
}

// ─── 메뉴 ────────────────────────────────────────────────────────────────────

function printMenu(): void {
  console.log('\n' + '═'.repeat(54));
  console.log('  업비트 모의 투자 — UseCase 데모');
  console.log('═'.repeat(54));
  if (loggedInMember) {
    const w = loggedInMember.getWallet();
    console.log(`  👤 ${loggedInMember.getNickname()} (${loggedInMember.getEmail()})`);
    console.log(`  💰 잔액: ${fmt(w.getAvailableBalance())}원`);
  } else {
    console.log('  👤 비회원 (로그인 안 됨)');
  }
  if (usingMock) console.log('  ⚠️  mock 데이터 모드');
  console.log('─'.repeat(54));
  console.log('  [공개]                          [회원 전용]');
  console.log('   1. 코인 목록 조회               7. 자산 충전');
  console.log('   2. 코인 검색                    8. 코인 매수');
  console.log('   3. 차트 조회                    9. 코인 매도');
  console.log('   4. 호가 조회                   10. 보유코인 + 손익분석');
  console.log('                                  11. 거래내역 조회');
  console.log('   5. 로그인                      12. 보유 자산 조회');
  console.log('   6. 로그아웃                    13. 즐겨찾기 등록/해제');
  console.log('');
  console.log('   0. 종료');
  console.log('═'.repeat(54));
}

async function dispatch(choice: string): Promise<boolean> {
  switch (choice) {
    case '1': await handleUC1(); break;
    case '2': await handleUC2(); break;
    case '3': await handleUC3(); break;
    case '4': await handleUC4(); break;
    case '5': await handleLogin(); break;
    case '6': await handleLogout(); break;
    case '7': await handleUC7(); break;
    case '8': await handleUC5(); break;
    case '9': await handleUC6(); break;
    case '10': await handleUC8(); break;
    case '11': await handleUC9(); break;
    case '12': await handleUC10(); break;
    case '13': await handleUC11(); break;
    case '0': case 'q': case 'exit':
      return false;
    default:
      console.log('  ⚠️  올바른 메뉴 번호를 입력해주세요.');
  }
  return true;
}

async function main(): Promise<void> {
  console.log('\n업비트 모의 투자 CLI를 시작합니다...');

  let closed = false;
  rl.on('close', () => { closed = true; });

  while (!closed) {
    printMenu();
    let choice: string;
    try {
      choice = (await rl.question('  선택: ')).trim();
    } catch {
      break;
    }
    if (closed) break;
    const cont = await dispatch(choice);
    if (!cont) break;
  }

  console.log('\n  종료합니다. 안녕히 가세요!\n');
  if (!closed) rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});
