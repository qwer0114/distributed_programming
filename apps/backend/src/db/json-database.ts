/**
 * CLI 전용 JSON 파일 기반 DB
 * better-sqlite3 네이티브 모듈 없이 순수 JS로 동작합니다.
 * 데이터는 cli-data.json 파일에 저장됩니다.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as bcrypt from 'bcrypt';

const DATA_PATH = process.env.CLI_DB_PATH ?? path.join(process.cwd(), 'cli-data.json');

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export interface MemberRow {
  id: number;
  email: string;
  password: string;
  nickname: string;
  created_at: string;
}

export interface WalletRow {
  id: number;
  member_id: number;
  balance: number;
  locked: number;
}

export interface HoldingRow {
  id: number;
  member_id: number;
  currency: string;
  balance: number;
  locked: number;
  avg_buy_price: number;
  unit_currency: string;
}

export interface TradeHistoryRow {
  id: number;
  member_id: number;
  uuid: string;
  side: string;
  ord_type: string;
  price: number;
  volume: number;
  market: string;
  paid_fee: number;
  state: string;
  created_at: string;
}

export interface WatchlistRow {
  id: number;
  member_id: number;
  market: string;
  created_at: string;
}

interface DbData {
  members: MemberRow[];
  wallets: WalletRow[];
  holdings: HoldingRow[];
  histories: TradeHistoryRow[];
  watchlist: WatchlistRow[];
  _seq: number; // auto increment용
}

// ─── 파일 I/O ─────────────────────────────────────────────────────────────────

function load(): DbData {
  if (!fs.existsSync(DATA_PATH)) {
    return { members: [], wallets: [], holdings: [], histories: [], watchlist: [], _seq: 0 };
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as DbData;
}

function save(data: DbData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function nextId(data: DbData): number {
  return ++data._seq;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function registerMember(email: string, password: string, nickname: string): Promise<MemberRow> {
  const data = load();
  if (data.members.find(m => m.email === email)) {
    throw new Error('이미 사용 중인 이메일입니다.');
  }
  const hash = await bcrypt.hash(password, 10);
  const member: MemberRow = {
    id: nextId(data), email, password: hash, nickname,
    created_at: new Date().toISOString(),
  };
  data.members.push(member);
  data.wallets.push({ id: nextId(data), member_id: member.id, balance: 0, locked: 0 });
  save(data);
  return member;
}

export function findMemberByEmail(email: string): MemberRow | null {
  return load().members.find(m => m.email === email) ?? null;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export function getWallet(memberId: number): WalletRow | null {
  return load().wallets.find(w => w.member_id === memberId) ?? null;
}

export function saveWallet(memberId: number, balance: number, locked: number): void {
  const data = load();
  const w = data.wallets.find(w => w.member_id === memberId);
  if (w) { w.balance = balance; w.locked = locked; }
  save(data);
}

// ─── Holdings ─────────────────────────────────────────────────────────────────

export function getHoldings(memberId: number): HoldingRow[] {
  return load().holdings.filter(h => h.member_id === memberId);
}

export function upsertHolding(memberId: number, currency: string, balance: number, locked: number, avgBuyPrice: number): void {
  const data = load();
  const existing = data.holdings.find(h => h.member_id === memberId && h.currency === currency);
  if (existing) {
    existing.balance = balance;
    existing.locked = locked;
    existing.avg_buy_price = avgBuyPrice;
  } else {
    data.holdings.push({
      id: nextId(data), member_id: memberId, currency,
      balance, locked, avg_buy_price: avgBuyPrice, unit_currency: 'KRW',
    });
  }
  save(data);
}

export function deleteHolding(memberId: number, currency: string): void {
  const data = load();
  data.holdings = data.holdings.filter(h => !(h.member_id === memberId && h.currency === currency));
  save(data);
}

// ─── Trade Histories ──────────────────────────────────────────────────────────

export function insertTradeHistory(
  memberId: number, uuid: string, side: string, ordType: string,
  price: number, volume: number, market: string, paidFee: number,
): TradeHistoryRow {
  const data = load();
  const row: TradeHistoryRow = {
    id: nextId(data), member_id: memberId, uuid, side, ord_type: ordType,
    price, volume, market, paid_fee: paidFee, state: 'done',
    created_at: new Date().toISOString(),
  };
  data.histories.push(row);
  save(data);
  return row;
}

export function getTradeHistories(memberId: number): TradeHistoryRow[] {
  return load().histories
    .filter(h => h.member_id === memberId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export function getWatchlistItems(memberId: number): WatchlistRow[] {
  return load().watchlist.filter(w => w.member_id === memberId);
}

export function addWatchlistItem(memberId: number, market: string): void {
  const data = load();
  if (!data.watchlist.find(w => w.member_id === memberId && w.market === market)) {
    data.watchlist.push({ id: nextId(data), member_id: memberId, market, created_at: new Date().toISOString() });
    save(data);
  }
}

export function removeWatchlistItem(memberId: number, market: string): void {
  const data = load();
  data.watchlist = data.watchlist.filter(w => !(w.member_id === memberId && w.market === market));
  save(data);
}

// database.ts와 호환성을 위한 더미 db 객체
export const db = {
  transaction: (fn: () => void) => () => fn(),
  close: () => {},
};
