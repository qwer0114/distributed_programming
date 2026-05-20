// ─────────────────────────────────────────────────────────────
// 클래스 1: 사용자 (User) — «abstract»
//
// 비회원과 회원의 공통 속성/행동을 추상화한 최상위 클래스.
// abstract 선언으로 직접 new User() 불가 — 반드시 자식 클래스 사용.
// ─────────────────────────────────────────────────────────────

export abstract class User {
  private userId: string;     // 사용자 고유 식별자
  protected nickname: string; // 화면에 표시되는 이름 (자식 클래스에서 접근 허용)

  constructor(userId: string, nickname: string) {
    this.userId = userId;
    this.nickname = nickname;
  }

  // 로그인: 자식 클래스에서 오버라이드
  login(): void {
    console.log(`[User] ${this.nickname} 로그인`);
  }

  // 로그아웃: 세션 종료
  logout(): void {
    console.log(`[User] ${this.nickname} 로그아웃`);
  }

  getUserId(): string   { return this.userId; }
  getNickname(): string { return this.nickname; }
}


// ─── 사용 예시 ────────────────────────────────────────────────
// abstract 클래스라 직접 인스턴스 불가:
//   new User('u-1', '홍길동')  →  ❌ 컴파일 에러
//
// 자식 클래스를 통해서만 사용:
//   new Member('u-1', '홍길동', ...)  →  ✅
