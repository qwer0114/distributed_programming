/**
 * CLI 전용 sql.js 기반 DB
 *
 * sql.js = SQLite를 WebAssembly로 컴파일한 순수 JS 라이브러리.
 * better-sqlite3처럼 실제 .db 파일을 쓰지만, 네이티브 빌드가 전혀 필요 없습니다.
 * Windows / Linux / Mac 어디서나 동작합니다.
 */

import initSqlJs, { type Database } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import * as bcrypt from 'bcrypt';

const DB_PATH = process.env.CLI_DB_PATH ?? path.join(process.cwd(), 'cli.db');

// ─── DB 초기화 ────────────────────────────────────────────────────────────────

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
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
      locked     REAL    DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS holding_coins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id     INTEGER NOT NULL,
      currency      TEXT    NOT NULL,
      balance       REAL    DEFAULT 0,
      locked        REAL    DEFAULT 0,
      avg_buy_price REAL    DEFAULT 0,
      unit_currency TEXT    DEFAULT 'KRW',
      UNIQUE(member_id, currency)
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
      UNIQUE(member_id, market)
    );
  `);

  persist();
  return _db;
}

function persist(): void {
  if (!_db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export interface MemberRow {
  id: number; email: string; password: string; nickname: string; created_at: string;
}
export interface WalletRow {
  id: number; member_id: number; balance: number; locked: number;
}
export interface HoldingRow {
  id: number; member_id: number; currency: string;
  balance: number; locked: number; avg_buy_price: number; unit_currency: string;
}
export interface TradeHistoryRow {
  id: number; member_id: number; uuid: string; side: string; ord_type: string;
  price: number; volume: number; market: string; paid_fee: number; state: string; created_at: string;
}
export interface WatchlistRow {
  id: number; member_id: number; market: string; created_at: string;
}

// sql.js에서 행을 객체로 변환하는 헬퍼
function toObjects<T>(stmt: ReturnType<Database['prepare']>): T[] {
  const cols = stmt.getColumnNames();
  const rows: T[] = [];
  while (stmt.step()) {
    const vals = stmt.get();
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => { obj[c] = vals[i]; });
    rows.push(obj as T);
  }
  stmt.free();
  return rows;
}

function toObject<T>(stmt: ReturnType<Database['prepare']>): T | null {
  const rows = toObjects<T>(stmt);
  return rows[0] ?? null;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function registerMember(email: string, password: string, nickname: string): Promise<MemberRow> {
  const db = await getDb();
  const exists = toObject<MemberRow>(db.prepare('SELECT id FROM members WHERE email = ?', [email]));
  if (exists) throw new Error('이미 사용 중인 이메일입니다.');

  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO members (email, password, nickname) VALUES (?, ?, ?)', [email, hash, nickname]);

  const member = toObject<MemberRow>(db.prepare('SELECT * FROM members WHERE email = ?', [email]))!;
  db.run('INSERT INTO wallets (member_id, balance, locked) VALUES (?, 0, 0)', [member.id]);
  persist();
  return member;
}

export async function findMemberByEmail(email: string): Promise<MemberRow | null> {
  const db = await getDb();
  return toObject<MemberRow>(db.prepare('SELECT * FROM members WHERE email = ?', [email]));
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function getWallet(memberId: number): Promise<WalletRow | null> {
  const db = await getDb();
  return toObject<WalletRow>(db.prepare('SELECT * FROM wallets WHERE member_id = ?', [memberId]));
}

export async function saveWallet(memberId: number, balance: number, locked: number): Promise<void> {
  const db = await getDb();
  db.run('UPDATE wallets SET balance = ?, locked = ? WHERE member_id = ?', [balance, locked, memberId]);
  persist();
}

// ─── Holdings ─────────────────────────────────────────────────────────────────

export async function getHoldings(memberId: number): Promise<HoldingRow[]> {
  const db = await getDb();
  return toObjects<HoldingRow>(db.prepare('SELECT * FROM holding_coins WHERE member_id = ?', [memberId]));
}

export async function upsertHolding(memberId: number, currency: string, balance: number, locked: number, avgBuyPrice: number): Promise<void> {
  const db = await getDb();
  db.run(`
    INSERT INTO holding_coins (member_id, currency, balance, locked, avg_buy_price)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(member_id, currency)
    DO UPDATE SET balance = excluded.balance, locked = excluded.locked, avg_buy_price = excluded.avg_buy_price
  `, [memberId, currency, balance, locked, avgBuyPrice]);
  persist();
}

export async function deleteHolding(memberId: number, currency: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM holding_coins WHERE member_id = ? AND currency = ?', [memberId, currency]);
  persist();
}

// ─── Trade Histories ──────────────────────────────────────────────────────────

export async function insertTradeHistory(
  memberId: number, uuid: string, side: string, ordType: string,
  price: number, volume: number, market: string, paidFee: number,
): Promise<TradeHistoryRow> {
  const db = await getDb();
  db.run(`
    INSERT INTO trade_histories (member_id, uuid, side, ord_type, price, volume, market, paid_fee, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'done', datetime('now'))
  `, [memberId, uuid, side, ordType, price, volume, market, paidFee]);
  persist();
  return toObject<TradeHistoryRow>(db.prepare('SELECT * FROM trade_histories WHERE uuid = ?', [uuid]))!;
}

export async function getTradeHistories(memberId: number): Promise<TradeHistoryRow[]> {
  const db = await getDb();
  return toObjects<TradeHistoryRow>(
    db.prepare('SELECT * FROM trade_histories WHERE member_id = ? ORDER BY created_at DESC', [memberId]),
  );
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function getWatchlistItems(memberId: number): Promise<WatchlistRow[]> {
  const db = await getDb();
  return toObjects<WatchlistRow>(db.prepare('SELECT * FROM watchlist_items WHERE member_id = ?', [memberId]));
}

export async function addWatchlistItem(memberId: number, market: string): Promise<void> {
  const db = await getDb();
  db.run('INSERT OR IGNORE INTO watchlist_items (member_id, market) VALUES (?, ?)', [memberId, market]);
  persist();
}

export async function removeWatchlistItem(memberId: number, market: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM watchlist_items WHERE member_id = ? AND market = ?', [memberId, market]);
  persist();
}

export const db = {
  transaction: (fn: () => void) => () => fn(),
  close: () => { _db?.close(); _db = null; },
};
