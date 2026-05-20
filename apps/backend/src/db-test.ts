/**
 * 순수 SQL + better-sqlite3 학습용 데모
 * 실행: pnpm tsx src/db-test.ts
 *
 * TypeORM 없이 better-sqlite3만으로 SQLite를 다루는 방법을 보여줍니다.
 */

import Database from 'better-sqlite3';

// ─── 1. DB 연결 ───────────────────────────────────────────────────────────────

const db = new Database(':memory:'); // 메모리 DB (테스트용, 파일로 쓸 때는 'test.db')

console.log('✅ DB 연결 성공 (in-memory SQLite)\n');

// ─── 2. 테이블 생성 (DDL) ─────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    UNIQUE NOT NULL,
    nickname   TEXT    NOT NULL,
    balance    REAL    DEFAULT 0,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    market     TEXT    NOT NULL,
    side       TEXT    NOT NULL CHECK(side IN ('bid', 'ask')),
    price      REAL    NOT NULL,
    volume     REAL    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

console.log('✅ 테이블 생성 완료 (users, orders)\n');

// ─── 3. INSERT ────────────────────────────────────────────────────────────────

console.log('── INSERT ───────────────────────────────────');

const insertUser = db.prepare(
  'INSERT INTO users (email, nickname, balance) VALUES (?, ?, ?)',
);

// run()은 동기 실행, lastInsertRowid로 방금 삽입된 id를 알 수 있음
const r1 = insertUser.run('alice@example.com', '앨리스', 1_000_000);
const r2 = insertUser.run('bob@example.com', '밥', 500_000);

console.log(`  alice id: ${r1.lastInsertRowid},  bob id: ${r2.lastInsertRowid}`);

// UNIQUE 제약 위반 시 에러 발생
try {
  insertUser.run('alice@example.com', '중복앨리스', 0);
} catch (e) {
  console.log(`  중복 이메일 에러: ${(e as Error).message}`);
}

console.log();

// ─── 4. SELECT ────────────────────────────────────────────────────────────────

console.log('── SELECT ───────────────────────────────────');

// get()은 단일 행 반환 (없으면 undefined)
const alice = db.prepare('SELECT * FROM users WHERE email = ?').get('alice@example.com') as { id: number; email: string; nickname: string; balance: number; created_at: string };
console.log(`  alice: id=${alice.id}, nickname=${alice.nickname}, balance=${alice.balance.toLocaleString()}원`);

// all()은 전체 행 배열 반환
const allUsers = db.prepare('SELECT id, nickname, balance FROM users ORDER BY id').all() as { id: number; nickname: string; balance: number }[];
console.log(`  전체 유저 ${allUsers.length}명:`);
allUsers.forEach(u => console.log(`    - [${u.id}] ${u.nickname}: ${u.balance.toLocaleString()}원`));

console.log();

// ─── 5. UPDATE ────────────────────────────────────────────────────────────────

console.log('── UPDATE ───────────────────────────────────');

const updateBalance = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
const result = updateBalance.run(200_000, alice.id);

console.log(`  alice 잔액 +20만원  (변경된 행 수: ${result.changes})`);

const aliceAfter = db.prepare('SELECT balance FROM users WHERE id = ?').get(alice.id) as { balance: number };
console.log(`  alice 잔액: ${aliceAfter.balance.toLocaleString()}원`);

console.log();

// ─── 6. 트랜잭션 ─────────────────────────────────────────────────────────────

console.log('── 트랜잭션 ─────────────────────────────────');

// db.transaction()으로 감싸면 성공 시 COMMIT, 예외 발생 시 자동 ROLLBACK
const transfer = db.transaction((fromId: number, toId: number, amount: number) => {
  const from = db.prepare('SELECT balance FROM users WHERE id = ?').get(fromId) as { balance: number };
  if (from.balance < amount) throw new Error('잔액 부족');

  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, fromId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, toId);

  return { fromId, toId, amount };
});

// 정상 이체
const tx = transfer(alice.id, r2.lastInsertRowid as number, 300_000);
console.log(`  이체 완료: [${tx.fromId}] → [${tx.toId}] ${tx.amount.toLocaleString()}원`);

// 잔액 부족 → 롤백
try {
  transfer(alice.id, r2.lastInsertRowid as number, 99_999_999);
} catch (e) {
  console.log(`  이체 실패 (롤백): ${(e as Error).message}`);
}

const finalUsers = db.prepare('SELECT id, nickname, balance FROM users ORDER BY id').all() as { id: number; nickname: string; balance: number }[];
console.log('  최종 잔액:');
finalUsers.forEach(u => console.log(`    - ${u.nickname}: ${u.balance.toLocaleString()}원`));

console.log();

// ─── 7. JOIN ──────────────────────────────────────────────────────────────────

console.log('── JOIN ─────────────────────────────────────');

const insertOrder = db.prepare(
  'INSERT INTO orders (user_id, market, side, price, volume) VALUES (?, ?, ?, ?, ?)',
);
insertOrder.run(alice.id, 'KRW-BTC', 'bid', 145_000_000, 0.001);
insertOrder.run(alice.id, 'KRW-ETH', 'bid', 5_200_000, 0.01);
insertOrder.run(r2.lastInsertRowid as number, 'KRW-BTC', 'ask', 145_500_000, 0.002);

const joined = db.prepare(`
  SELECT u.nickname, o.market, o.side, o.price, o.volume
  FROM orders o
  JOIN users u ON u.id = o.user_id
  ORDER BY o.id
`).all() as { nickname: string; market: string; side: string; price: number; volume: number }[];

console.log(`  주문 내역 (JOIN):`);
joined.forEach(row => {
  const side = row.side === 'bid' ? '매수' : '매도';
  console.log(`    ${row.nickname} | ${row.market} | ${side} | ${row.price.toLocaleString()}원 × ${row.volume}`);
});

console.log();

// ─── 8. DELETE ────────────────────────────────────────────────────────────────

console.log('── DELETE ───────────────────────────────────');

// 외래키(FK) 제약: orders가 있는 user를 바로 삭제하면 에러
try {
  db.prepare('DELETE FROM users WHERE id = ?').run(r2.lastInsertRowid as number);
} catch (e) {
  console.log(`  FK 제약 에러: ${(e as Error).message}`);
  console.log('  → 자식 테이블(orders) 먼저 삭제해야 합니다.');
}

// 올바른 순서: 자식(orders) 먼저 삭제 → 부모(users) 삭제
db.prepare('DELETE FROM orders WHERE user_id = ?').run(r2.lastInsertRowid as number);
const del = db.prepare('DELETE FROM users WHERE id = ?').run(r2.lastInsertRowid as number);
console.log(`  밥 삭제 완료 (삭제된 행 수: ${del.changes})`);

const remaining = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
console.log(`  남은 유저 수: ${remaining.cnt}명`);

console.log();

// ─── 9. 집계 함수 ─────────────────────────────────────────────────────────────

console.log('── 집계 함수 (COUNT / SUM / AVG) ──────────');

insertOrder.run(alice.id, 'KRW-BTC', 'bid', 146_000_000, 0.002);

const stats = db.prepare(`
  SELECT
    COUNT(*)        AS total,
    SUM(price * volume) AS total_amount,
    AVG(price)      AS avg_price
  FROM orders WHERE user_id = ?
`).get(alice.id) as { total: number; total_amount: number; avg_price: number };

console.log(`  alice 주문 수: ${stats.total}건`);
console.log(`  총 거래금액: ${Math.round(stats.total_amount).toLocaleString()}원`);
console.log(`  평균 가격: ${Math.round(stats.avg_price).toLocaleString()}원`);

console.log();
console.log('✅ db-test 완료 — TypeORM 없이 순수 SQL로 CRUD + 트랜잭션 + JOIN + 집계 모두 동작!');

db.close();
