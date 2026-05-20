// ─────────────────────────────────────────────────────────────
// 클래스 4: 지갑 (Wallet)
//
// 회원의 KRW 가상 자산을 관리합니다.
// Composition 부분 — Member 없이 단독으로 존재할 수 없습니다.
//
// balance : 실제 보유 금액
// locked  : 미체결 주문으로 묶인 금액 (현재 구현에서는 항상 0)
// ─────────────────────────────────────────────────────────────

export class Wallet {
  private currency: string = 'KRW'; // 항상 KRW
  private balance: number  = 0;
  private locked: number   = 0;

  // UC7: 충전 — 최소 10,000원 미만이면 에러
  charge(amount: number): void {
    if (amount < 10_000) {
      throw new Error('최소 충전 금액은 10,000원입니다.');
    }
    this.balance += amount;
  }

  // 매도 대금 입금 — 최소 금액 제한 없음
  credit(amount: number): void {
    this.balance += amount;
  }

  // 매수 시 잔액 차감 — 잔액 부족 시 에러
  deduct(amount: number): void {
    if (this.getAvailableBalance() < amount) {
      throw new Error('잔액이 부족합니다.');
    }
    this.balance -= amount;
  }

  // 사용 가능 잔액 = balance - locked
  getAvailableBalance(): number { return this.balance - this.locked; }

  getCurrency(): string  { return this.currency; }
  getBalance(): number   { return this.balance; }
  getLocked(): number    { return this.locked; }

  // DB에서 불러올 때 사용 (로그인 시 기존 잔액 복원)
  load(balance: number, locked: number): void {
    this.balance = balance;
    this.locked  = locked;
  }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// const wallet = new Wallet();
// wallet.charge(100_000);            // balance: 100,000
// wallet.deduct(50_000);             // balance: 50,000
// wallet.charge(5_000);              // ❌ Error: 최소 충전 금액은 10,000원
// console.log(wallet.getBalance());  // 50,000
