export class Wallet {
  private currency: string = 'KRW';
  private balance: number = 0;
  private locked: number = 0;

  charge(amount: number): void {
    if (amount < 10_000) {
      throw new Error('최소 충전 금액은 10,000원입니다.');
    }
    this.balance += amount;
  }

  credit(amount: number): void {
    this.balance += amount;
  }

  deduct(amount: number): void {
    if (this.getAvailableBalance() < amount) {
      throw new Error('잔액이 부족합니다.');
    }
    this.balance -= amount;
  }

  getAvailableBalance(): number {
    return this.balance - this.locked;
  }

  getCurrency(): string { return this.currency; }
  getBalance(): number { return this.balance; }
  getLocked(): number { return this.locked; }
}
