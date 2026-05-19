# 비트코인 모의 투자 서비스 - 백엔드 개발 가이드

## 📚 업비트 공식 문서 참조

> 업비트 API 구현 시 아래 URL을 @로 참조할 것

- **전체 문서 목록**: https://docs.upbit.com/kr/llms.txt
- **인증 가이드**: https://docs.upbit.com/kr/reference/auth.md
- **REST API 가이드**: https://docs.upbit.com/kr/reference/rest-api-guide.md
- **Rate Limits**: https://docs.upbit.com/kr/reference/rate-limits.md
- **REST Best Practice**: https://docs.upbit.com/kr/docs/rest-api-best-practice.md

---

## 🏗️ 프로젝트 스택

- **Framework**: NestJS v10 + TypeScript
- **ORM**: TypeORM + better-sqlite3
- **인증**: express-session + @nestjs/passport + passport-local + bcrypt
- **세션 스토어**: better-sqlite3-session-store (SQLite에 세션 저장)
- **유효성 검사**: class-validator + class-transformer
- **HTTP 클라이언트**: fetch (업비트 API 호출용)
- **API 문서**: @nestjs/swagger
- **패키지 매니저**: pnpm (모노레포 `apps/backend`)

---

## 📁 디렉토리 구조

```
apps/backend/src/
├── main.ts
├── app.module.ts
├── domain/                        # 순수 도메인 클래스 (DB 어노테이션 없음)
│   ├── user/
│   │   ├── user.entity.ts         # abstract
│   │   ├── member.entity.ts
│   │   └── non-member.entity.ts
│   ├── coin/
│   │   ├── coin.entity.ts
│   │   ├── ticker.entity.ts
│   │   ├── candle.entity.ts
│   │   └── order-book.entity.ts   # OrderBook + OrderBookUnit
│   ├── member/
│   │   ├── wallet.entity.ts
│   │   ├── portfolio.entity.ts    # Portfolio + HoldingCoin
│   │   └── watchlist.entity.ts
│   └── trade/
│       └── trade-history.entity.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── local.strategy.ts
│   │   ├── local-auth.guard.ts
│   │   ├── session-auth.guard.ts
│   │   ├── session.serializer.ts
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       └── login.dto.ts
│   ├── wallet/
│   ├── trade/
│   ├── portfolio/
│   ├── watchlist/
│   └── upbit/
├── orm/                           # TypeORM 엔티티 (DB 매핑, domain과 분리)
│   ├── member.orm-entity.ts
│   ├── wallet.orm-entity.ts
│   ├── holding-coin.orm-entity.ts
│   ├── trade-history.orm-entity.ts
│   └── watchlist-item.orm-entity.ts
└── common/
    ├── decorators/
    │   └── current-user.decorator.ts
    └── filters/
        └── http-exception.filter.ts
```

---

## 🗄️ DB 설정 (TypeORM + SQLite)

```typescript
TypeOrmModule.forRoot({
  type: "better-sqlite3",
  database: "coin.db",
  entities: [__dirname + "/orm/*.orm-entity{.ts,.js}"],
  synchronize: true,
});
```

---

## 📐 도메인 클래스 설계 명세

> 아래 명세를 기반으로 `domain/` 하위 클래스를 구현할 것.
> TypeORM 어노테이션은 절대 포함하지 말 것 — ORM 매핑은 `orm/`에서만.

---

### 클래스 관계 요약

| 관계 유형      | 개수 | 전체(Whole) / 부모                                                          | 부분(Part) / 자식                              |
| -------------- | ---- | --------------------------------------------------------------------------- | ---------------------------------------------- |
| Generalization | 2    | 사용자                                                                      | 비회원, 회원                                   |
| Composition ◆  | 5    | 회원(→지갑, 포트폴리오, 즐겨찾기) / 포트폴리오(→보유코인) / 호가(→호가단위) | 지갑, 포트폴리오, 즐겨찾기, 보유코인, 호가단위 |
| Association →  | 7    | 회원, 보유코인, 거래내역, 티커, 캔들, 호가, 즐겨찾기                        | 거래내역, 코인                                 |

---

### 1. 사용자 `«abstract»`

**설계 목적**: 비회원과 회원의 공통 속성·행동을 추상화한 최상위 클래스. 직접 인스턴스 생성 불가.

| 접근 | 속성명   | 타입   | 설명                        |
| ---- | -------- | ------ | --------------------------- |
| -    | userId   | String | 사용자 고유 식별자          |
| -    | nickname | String | 화면에 표시되는 사용자 이름 |

| 접근 | 메서드명 | 반환 타입 | 설명                                             |
| ---- | -------- | --------- | ------------------------------------------------ |
| +    | login()  | void      | 이메일·비밀번호 인증. 회원 클래스에서 오버라이드 |
| +    | logout() | void      | 세션 종료 및 로그인 상태 해제                    |

**관계**: Generalization 부모 → 비회원, 회원

---

### 2. 비회원

**설계 목적**: 로그인 없이 공개 기능(조회·검색·차트·호가)만 이용하는 사용자. 독립 속성 없음.

| 접근 | 메서드명        | 반환 타입      | 설명                                                |
| ---- | --------------- | -------------- | --------------------------------------------------- |
| +    | viewCoinList()  | List\<Coin\>   | 코인 목록 조회. 업비트 market/all + ticker API 호출 |
| +    | searchCoin()    | Coin           | 코인명 또는 심볼로 검색                             |
| +    | viewChart()     | List\<Candle\> | 캔들 차트 데이터 조회. 업비트 candles API 호출      |
| +    | viewOrderBook() | OrderBook      | 호가 정보 조회. 업비트 orderbook API 호출           |

**관계**: Generalization 자식 ← 사용자

---

### 3. 회원

**설계 목적**: 인증된 사용자. 매수·매도·자산관리 전용 기능 수행. 지갑·포트폴리오·즐겨찾기를 Composition으로 소유.

| 접근 | 속성명    | 타입   | 설명                     |
| ---- | --------- | ------ | ------------------------ |
| -    | email     | String | 로그인 이메일            |
| -    | password  | String | bcrypt 암호화된 비밀번호 |
| -    | createdAt | String | 가입 일시. ISO 8601 형식 |

| 접근 | 메서드명           | 반환 타입            | 설명                                                       |
| ---- | ------------------ | -------------------- | ---------------------------------------------------------- |
| +    | buyCoin()          | TradeHistory         | 코인 매수. 내부적으로 시세조회→잔액확인→거래기록 include   |
| +    | sellCoin()         | TradeHistory         | 코인 매도. 내부적으로 시세조회→보유량확인→거래기록 include |
| +    | charge()           | void                 | KRW 충전. 지갑의 charge() 호출                             |
| +    | viewPortfolio()    | Portfolio            | 포트폴리오 객체 반환                                       |
| +    | viewTradeHistory() | List\<TradeHistory\> | 거래내역 목록 반환                                         |

**관계**:

- Generalization 자식 ← 사용자
- Composition ◆ → 지갑 (회원 삭제 시 함께 소멸)
- Composition ◆ → 포트폴리오 (회원 삭제 시 함께 소멸)
- Composition ◆ → 즐겨찾기 (회원 삭제 시 함께 소멸)
- Association → 거래내역 (감사 목적으로 회원 삭제 후에도 보존 가능)

---

### 4. 지갑

**설계 목적**: 회원의 KRW 가상 자산 관리. 업비트 accounts API의 balance/locked 필드 기반.

| 접근 | 속성명   | 타입   | 설명                         |
| ---- | -------- | ------ | ---------------------------- |
| -    | currency | String | 통화 단위. 항상 'KRW'        |
| -    | balance  | double | 사용 가능한 KRW 잔액         |
| -    | locked   | double | 진행 중인 주문으로 묶인 금액 |

| 접근 | 메서드명              | 반환 타입 | 설명                         |
| ---- | --------------------- | --------- | ---------------------------- |
| +    | charge()              | void      | 입력 금액을 balance에 추가   |
| +    | deduct()              | void      | 매수 금액을 balance에서 차감 |
| +    | getAvailableBalance() | double    | balance - locked 반환        |

**관계**: Composition 부분 ◆ ← 회원

---

### 5. 코인

**설계 목적**: 거래 가능한 코인 종목 정보. 업비트 market/all API 응답 기반. 독립 라이프사이클.

| 접근 | 속성명        | 타입   | 설명                        |
| ---- | ------------- | ------ | --------------------------- |
| -    | market        | String | 마켓 코드. 예: 'KRW-BTC'    |
| -    | koreanName    | String | 한국어 이름. 예: '비트코인' |
| -    | englishName   | String | 영문 이름. 예: 'Bitcoin'    |
| -    | marketWarning | String | 'NONE' 또는 'CAUTION'       |

| 접근 | 메서드명        | 반환 타입 | 설명             |
| ---- | --------------- | --------- | ---------------- |
| +    | getMarketCode() | String    | market 필드 반환 |

**관계**: Association ← (티커, 캔들, 호가, 보유코인, 거래내역에서 참조됨) / Association ↔ 즐겨찾기 (N:M)

---

### 6. 티커

**설계 목적**: 코인 실시간 현재가 스냅샷. 업비트 /v1/ticker 응답 필드 그대로 매핑.

| 접근 | 속성명            | 타입   | 설명                    |
| ---- | ----------------- | ------ | ----------------------- |
| -    | market            | String | 마켓 코드               |
| -    | tradePrice        | double | 현재 체결가             |
| -    | openingPrice      | double | 당일 시가               |
| -    | highPrice         | double | 당일 고가               |
| -    | lowPrice          | double | 당일 저가               |
| -    | prevClosingPrice  | double | 전일 종가               |
| -    | change            | String | RISE / FALL / EVEN      |
| -    | changeRate        | double | 등락률 (부호 없음)      |
| -    | accTradeVolume24h | double | 24시간 누적 거래량      |
| -    | tradeTimestamp    | long   | 마지막 체결 Unix 밀리초 |

| 접근 | 메서드명        | 반환 타입 | 설명                                     |
| ---- | --------------- | --------- | ---------------------------------------- |
| +    | getChangeRate() | double    | change 방향 반영한 부호 포함 등락률 반환 |
| +    | isRising()      | boolean   | change === 'RISE'이면 true               |

**관계**: Association → 코인

---

### 7. 캔들

**설계 목적**: 코인 OHLCV 시계열 데이터. 업비트 /v1/candles/minutes/{unit} 응답 기반.

| 접근 | 속성명               | 타입   | 설명                                           |
| ---- | -------------------- | ------ | ---------------------------------------------- |
| -    | market               | String | 마켓 코드                                      |
| -    | candleDateTimeKst    | String | 캔들 기준 시각(KST). 'yyyy-MM-dd HH:mm:ss'     |
| -    | openingPrice         | double | 시가                                           |
| -    | highPrice            | double | 고가                                           |
| -    | lowPrice             | double | 저가                                           |
| -    | tradePrice           | double | 종가                                           |
| -    | candleAccTradeVolume | double | 해당 캔들 기간 누적 거래량                     |
| -    | unit                 | int    | 분봉 단위 (1/3/5/10/15/30/60/240). 일봉 등은 0 |

| 접근 | 메서드명        | 반환 타입 | 설명             |
| ---- | --------------- | --------- | ---------------- |
| +    | getCandleData() | Candle    | 캔들 데이터 반환 |

**관계**: Association → 코인

---

### 8. 호가 (OrderBook)

**설계 목적**: 코인 매수/매도 호가 정보. 업비트 /v1/orderbook 응답 기반. 호가단위를 Composition으로 포함.

| 접근 | 속성명       | 타입   | 설명                         |
| ---- | ------------ | ------ | ---------------------------- |
| -    | market       | String | 마켓 코드                    |
| -    | timestamp    | long   | 호가 생성 시각 (Unix 밀리초) |
| -    | totalAskSize | double | 매도 호가 총 잔량            |
| -    | totalBidSize | double | 매수 호가 총 잔량            |

| 접근 | 메서드명       | 반환 타입 | 설명                              |
| ---- | -------------- | --------- | --------------------------------- |
| +    | getOrderBook() | OrderBook | 호가 전체 데이터 반환             |
| +    | getSpread()    | double    | 최우선 매도호가 - 최우선 매수호가 |

**관계**: Composition ◆ → 호가단위 / Association → 코인

---

### 9. 호가단위 (OrderBookUnit)

**설계 목적**: 호가 내 개별 매수/매도 한 단계. 업비트 orderbook_units 배열 원소. 호가에 Composition으로 포함.

| 접근 | 속성명   | 타입   | 설명      |
| ---- | -------- | ------ | --------- |
| -    | askPrice | double | 매도 호가 |
| -    | askSize  | double | 매도 잔량 |
| -    | bidPrice | double | 매수 호가 |
| -    | bidSize  | double | 매수 잔량 |

**관계**: Composition 부분 ◆ ← 호가

---

### 10. 포트폴리오

**설계 목적**: 회원의 전체 투자 현황 집계. 보유코인을 Composition으로 포함.

| 접근 | 속성명          | 타입   | 설명                                                                      |
| ---- | --------------- | ------ | ------------------------------------------------------------------------- |
| -    | totalEvalAmount | double | 보유 코인 전체 평가금액 합계                                              |
| -    | totalBuyAmount  | double | 전체 매수금액 합계                                                        |
| -    | totalProfitRate | double | 전체 수익률(%). (totalEvalAmount - totalBuyAmount) / totalBuyAmount × 100 |

| 접근 | 메서드명         | 반환 타입 | 설명                             |
| ---- | ---------------- | --------- | -------------------------------- |
| +    | calcProfitRate() | double    | 전체 수익률 계산 후 반환         |
| +    | analyzeProfit()  | void      | 손익 분석 UseCase(extend) 진입점 |

**관계**: Composition 부분 ◆ ← 회원 / Composition ◆ → 보유코인

---

### 11. 보유코인 (HoldingCoin)

**설계 목적**: 회원이 보유한 특정 코인의 수량·평균매수가·평가금액. 업비트 /v1/accounts 응답 기반.

| 접근 | 속성명       | 타입   | 설명                                    |
| ---- | ------------ | ------ | --------------------------------------- |
| -    | currency     | String | 코인 심볼. 예: 'BTC'                    |
| -    | balance      | double | 현재 보유 수량                          |
| -    | locked       | double | 매도 주문 중 묶인 수량                  |
| -    | avgBuyPrice  | double | 평균 매수가                             |
| -    | unitCurrency | String | 기준 통화. 항상 'KRW'                   |
| -    | evalAmount   | double | 현재가 기준 평가금액 (balance × 현재가) |

| 접근 | 메서드명        | 반환 타입 | 설명                                       |
| ---- | --------------- | --------- | ------------------------------------------ |
| +    | getProfitRate() | double    | (현재가 - avgBuyPrice) / avgBuyPrice × 100 |
| +    | getEvalAmount() | double    | 현재가 기준 평가금액 반환                  |

**관계**: Composition 부분 ◆ ← 포트폴리오 / Association → 코인

---

### 12. 거래내역 (TradeHistory)

**설계 목적**: 매수·매도 시 생성되는 거래 기록. 업비트 /v1/orders 응답 필드 기반.

| 접근 | 속성명    | 타입   | 설명                                                           |
| ---- | --------- | ------ | -------------------------------------------------------------- |
| -    | uuid      | String | 거래 고유 식별자                                               |
| -    | side      | String | 'ask'(매도) 또는 'bid'(매수)                                   |
| -    | ordType   | String | 'limit'(지정가) / 'price'(시장가 매수) / 'market'(시장가 매도) |
| -    | price     | double | 주문 가격                                                      |
| -    | volume    | double | 주문 수량                                                      |
| -    | market    | String | 마켓 코드                                                      |
| -    | createdAt | String | 주문 생성 일시. ISO 8601                                       |
| -    | state     | String | 'done' / 'cancel' / 'wait'                                     |
| -    | paidFee   | double | 실제 지불 수수료                                               |

| 접근 | 메서드명       | 반환 타입    | 설명               |
| ---- | -------------- | ------------ | ------------------ |
| +    | getTradeInfo() | TradeHistory | 거래내역 객체 반환 |

**관계**: Association ← 회원 (1:N, 회원 삭제 후에도 보존 가능) / Association → 코인

---

### 13. 즐겨찾기 (Watchlist)

**설계 목적**: 회원의 관심 코인 목록. 회원 계정에 Composition으로 종속.

| 접근 | 속성명      | 타입   | 설명                      |
| ---- | ----------- | ------ | ------------------------- |
| -    | watchlistId | int    | 즐겨찾기 목록 고유 식별자 |
| -    | createdAt   | String | 생성 일시                 |

| 접근 | 메서드명      | 반환 타입    | 설명                                    |
| ---- | ------------- | ------------ | --------------------------------------- |
| +    | addCoin()     | void         | 즐겨찾기에 코인 추가 (기본 경로)        |
| +    | removeCoin()  | void         | 즐겨찾기에서 코인 제거 (Alternative A1) |
| +    | getCoinList() | List\<Coin\> | 현재 즐겨찾기 코인 목록 반환            |

**관계**: Composition 부분 ◆ ← 회원 / Association ↔ 코인 (N:M)

---

## 🗂️ ORM 엔티티 스펙

> domain/ 클래스와 별도로 orm/ 에만 TypeORM 어노테이션 적용

```
Member:          id(PK), email(unique), password(bcrypt), nickname, createdAt
Wallet:          id(PK), balance(float, default 0), locked(float, default 0), memberId(FK, 1:1)
HoldingCoin:     id(PK), currency, balance(float), locked(float), avgBuyPrice(float),
                 unitCurrency(default 'KRW'), evalAmount(float), memberId(FK, N:1)
TradeHistory:    id(PK), uuid(unique), side(bid|ask), ordType, price(float), volume(float),
                 market, paidFee(float), state(done|cancel|wait), createdAt, memberId(FK, N:1)
WatchlistItem:   id(PK), market, memberId(FK, N:1), createdAt
```

---

## 🔐 세션 인증 흐름

### 패키지 설치

```bash
pnpm add express-session @nestjs/passport passport passport-local bcrypt better-sqlite3-session-store
pnpm add -D @types/express-session @types/passport @types/passport-local @types/bcrypt
```

### 세션 설정 (main.ts)

```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new SqliteStore({ client: new Database("sessions.db") }),
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 },
  }),
);
app.use(passport.initialize());
app.use(passport.session());
```

### session.serializer.ts

```typescript
serializeUser:   세션에 memberId(number)만 저장
deserializeUser: memberId로 DB 조회 후 req.user에 복원
```

### 인증 흐름

```
회원가입: POST /auth/register → bcrypt.hash(password, 10) → Member INSERT → 201
로그인:   POST /auth/login   → LocalAuthGuard(passport-local) → 세션 생성 → 200
로그아웃: POST /auth/logout  → req.logout() → 세션 파기 → 200
내 정보:  GET  /auth/me      → SessionAuthGuard → req.user 반환
```

---

## 🌐 API 엔드포인트

### AuthModule

| Method | Path           | 인증 | 설명                                            |
| ------ | -------------- | ---- | ----------------------------------------------- |
| POST   | /auth/register | ❌   | 회원가입. body: `{ email, password, nickname }` |
| POST   | /auth/login    | ❌   | 로그인. body: `{ email, password }`. 세션 발급  |
| POST   | /auth/logout   | ✅   | 로그아웃. 세션 파기                             |
| GET    | /auth/me       | ✅   | 현재 로그인 사용자 정보 반환                    |

### WalletModule

| Method | Path           | 인증 | 설명                                           |
| ------ | -------------- | ---- | ---------------------------------------------- |
| POST   | /wallet/charge | ✅   | KRW 충전. body: `{ amount }`. 최소 10,000 검증 |
| GET    | /wallet        | ✅   | 현재 잔액 조회                                 |

### TradeModule

| Method | Path           | 인증 | 설명                             |
| ------ | -------------- | ---- | -------------------------------- |
| POST   | /trade/buy     | ✅   | 매수. body: `{ market, volume }` |
| POST   | /trade/sell    | ✅   | 매도. body: `{ market, volume }` |
| GET    | /trade/history | ✅   | 본인 거래내역 전체 조회          |

### PortfolioModule

| Method | Path       | 인증 | 설명                                   |
| ------ | ---------- | ---- | -------------------------------------- |
| GET    | /portfolio | ✅   | 보유코인 + 업비트 현재가 + 수익률 반환 |

### WatchlistModule

| Method | Path               | 인증 | 설명                         |
| ------ | ------------------ | ---- | ---------------------------- |
| POST   | /watchlist/:market | ✅   | 즐겨찾기 토글 (등록 or 제거) |
| GET    | /watchlist         | ✅   | 즐겨찾기 목록 반환           |

### UpbitModule (프록시)

| Method | Path             | 인증 | 설명                                            |
| ------ | ---------------- | ---- | ----------------------------------------------- |
| GET    | /upbit/markets   | ❌   | 전체 코인 목록 (/v1/market/all)                 |
| GET    | /upbit/ticker    | ❌   | 현재가. query: `markets=KRW-BTC`                |
| GET    | /upbit/candles   | ❌   | 분봉. query: `market=KRW-BTC&unit=60&count=200` |
| GET    | /upbit/orderbook | ❌   | 호가. query: `markets=KRW-BTC`                  |

---

## 📡 UpbitService 패턴

```typescript
@Injectable()
export class UpbitService {
  private readonly BASE = "https://api.upbit.com/v1";

  async getTicker(markets: string) {
    const res = await fetch(`${this.BASE}/ticker?markets=${markets}`);
    return res.json();
  }
  async getCandles(market: string, unit: number, count = 200) {
    const res = await fetch(
      `${this.BASE}/candles/minutes/${unit}?market=${market}&count=${count}`,
    );
    return res.json();
  }
  async getOrderBook(markets: string) {
    const res = await fetch(`${this.BASE}/orderbook?markets=${markets}`);
    return res.json();
  }
  async getMarkets() {
    const res = await fetch(`${this.BASE}/market/all?isDetails=false`);
    return res.json();
  }
}
```

---

## 💱 매수 / 매도 트랜잭션 흐름

### 매수 (`POST /trade/buy`)

```
1. UpbitService.getTicker(market) → 현재가 조회
2. volume < 0.0001 → 400 BadRequest
3. 필요금액 = 현재가 × volume
4. Wallet.getAvailableBalance() < 필요금액 → 400 BadRequest
5. QueryRunner 트랜잭션 시작
   5-1. Wallet.balance -= 필요금액
   5-2. HoldingCoin upsert
        없으면: INSERT (balance=volume, avgBuyPrice=현재가, evalAmount=필요금액)
        있으면: avgBuyPrice 가중평균 재계산, balance += volume
   5-3. TradeHistory INSERT (side='bid', state='done', paidFee=필요금액×0.0005)
6. 커밋 → 실패 시 롤백 후 500
```

### 매도 (`POST /trade/sell`)

```
1. UpbitService.getTicker(market) → 현재가 조회
2. volume < 0.0001 → 400 BadRequest
3. HoldingCoin.(balance - locked) < volume → 400 BadRequest
4. QueryRunner 트랜잭션 시작
   4-1. HoldingCoin.balance -= volume
   4-2. 수수료 = 현재가 × volume × 0.0005
   4-3. Wallet.balance += 현재가 × volume - 수수료
   4-4. TradeHistory INSERT (side='ask', state='done', paidFee=수수료)
5. 커밋 → 실패 시 롤백 후 500
```

---

## ⚠️ 코딩 컨벤션 및 주의사항

1. **업비트 API 호출은 `UpbitService`에서만** — 다른 곳에서 직접 fetch 금지
2. **매수/매도는 반드시 `QueryRunner` 트랜잭션** — 잔액 차감과 거래 기록은 원자적으로
3. **`domain/`과 `orm/`은 반드시 분리** — TypeORM 어노테이션은 `orm/`에만 작성
4. **에러는 `HttpException` 표준 형식** — `throw new BadRequestException('메시지')`
5. **비밀번호 평문 저장 금지** — 반드시 bcrypt hash 후 저장
6. **SESSION_SECRET은 환경변수** — 하드코딩 금지
7. **Rate Limit 준수** — https://docs.upbit.com/kr/reference/rate-limits.md

---

## 🌱 환경변수 (.env)

```
SESSION_SECRET=your_session_secret_key_here
PORT=3000
```
