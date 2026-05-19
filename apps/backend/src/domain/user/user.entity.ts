export abstract class User {
  protected userId: string;
  protected nickname: string;

  constructor(userId: string, nickname: string) {
    this.userId = userId;
    this.nickname = nickname;
  }

  login(): void {}

  logout(): void {}

  getUserId(): string { return this.userId; }
  getNickname(): string { return this.nickname; }
}
