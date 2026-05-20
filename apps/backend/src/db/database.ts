import Database, { type Database as DatabaseType } from 'better-sqlite3';
import * as bcrypt from 'bcrypt';
import path from 'path';

const DB_PATH = process.env.CLI_DB_PATH ?? path.join(process.cwd(), 'cli.db');

export const db: DatabaseType = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    nickname   TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id  INTEGER NOT NULL UNIQUE,
    balance    REAL    DEFAULT 0,
    locked     REAL    DEFAULT 0,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS holding_coins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id     INTEGER NOT NULL,
    currency      TEXT    NOT NULL,
    balance       REAL    DEFAULT 0,
    locked        REAL    DEFAULT 0,
    avg_buy_price REAL    DEFAULT 0,
    unit_currency TEXT    DEFAULT 'KRW',
    UNIQUE(member_id, currency),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trade_histories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id  INTEGER,
    uuid       TEXT    UNIQUE NOT NULL,
    side       TEXT    NOT NULL,
    ord_type   TEXT    DEFAULT 'limit',
    price      REAL    NOT NULL,
    volume     REAL    NOT NULL,
    market     TEXT    NOT NULL,
    paid_fee   REAL    DEFAULT 0,
    state      TEXT    DEFAULT 'done',
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watchlist_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id  INTEGER NOT NULL,
    market     TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now')),
    UNIQUE(member_id, market),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

// ─── Row Types ────────────────────────────────────────────────────────────────

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

// ─── Members ──────────────────────────────────────────────────────────────────

export async function registerMember(email: string, password: string, nickname: string): Promise<MemberRow> {
  const exists = db.prepare('SELECT id FROM members WHERE email = ?').get(email);
  if (exists) throw new Error('이미 사용 중인 이메일입니다.');

  const hash = await bcrypt.hash(password, 10);

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO members (email, password, nickname) VALUES (?, ?, ?)',
  ).run(email, hash, nickname);

  const memberId = lastInsertRowid as number;
  db.prepare('INSERT INTO wallets (member_id, balance, locked) VALUES (?, 0, 0)').run(memberId);

  return db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as MemberRow;
}

export function findMemberByEmail(email: string): MemberRow | null {
  return (db.prepare('SELECT * FROM members WHERE email = ?').get(email) as MemberRow) ?? null;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export function getWallet(memberId: number): WalletRow | null {
  return (db.prepare('SELECT * FROM wallets WHERE member_id = ?').get(memberId) as WalletRow) ?? null;
}

export function saveWallet(memberId: number, balance: number, locked: number): void {
  db.prepare('UPDATE wallets SET balance = ?, locked = ? WHERE member_id = ?').run(balance, locked, memberId);
}

// ─── Holdings ─────────────────────────────────────────────────────────────────

export function getHoldings(memberId: number): HoldingRow[] {
  return db.prepare('SELECT * FROM holding_coins WHERE member_id = ?').all(memberId) as HoldingRow[];
}

export function upsertHolding(memberId: number, currency: string, balance: number, locked: number, avgBuyPrice: number): void {
  db.prepare(`
    INSERT INTO holding_coins (member_id, currency, balance, locked, avg_buy_price)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(member_id, currency)
    DO UPDATE SET balance = excluded.balance, locked = excluded.locked, avg_buy_price = excluded.avg_buy_price
  `).run(memberId, currency, balance, locked, avgBuyPrice);
}

export function deleteHolding(memberId: number, currency: string): void {
  db.prepare('DELETE FROM holding_coins WHERE member_id = ? AND currency = ?').run(memberId, currency);
}

// ─── Trade Histories ──────────────────────────────────────────────────────────

export function insertTradeHistory(
  memberId: number, uuid: string, side: string, ordType: string,
  price: number, volume: number, market: string, paidFee: number,
): TradeHistoryRow {
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO trade_histories (member_id, uuid, side, ord_type, price, volume, market, paid_fee, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'done', datetime('now'))
  `).run(memberId, uuid, side, ordType, price, volume, market, paidFee);
  return db.prepare('SELECT * FROM trade_histories WHERE id = ?').get(lastInsertRowid) as TradeHistoryRow;
}

export function getTradeHistories(memberId: number): TradeHistoryRow[] {
  return db.prepare(
    'SELECT * FROM trade_histories WHERE member_id = ? ORDER BY created_at DESC',
  ).all(memberId) as TradeHistoryRow[];
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export function getWatchlistItems(memberId: number): WatchlistRow[] {
  return db.prepare('SELECT * FROM watchlist_items WHERE member_id = ?').all(memberId) as WatchlistRow[];
}

export function addWatchlistItem(memberId: number, market: string): void {
  db.prepare('INSERT OR IGNORE INTO watchlist_items (member_id, market) VALUES (?, ?)').run(memberId, market);
}

export function removeWatchlistItem(memberId: number, market: string): void {
  db.prepare('DELETE FROM watchlist_items WHERE member_id = ? AND market = ?').run(memberId, market);
}
