# 학습용 예시: Controller+Service 합친 버전 vs 분리된 버전

## 파일 구조

```
examples/
├── combined-auth.controller.ts    # 회원가입/로그인 — 합친 버전
├── combined-wallet.controller.ts  # 충전/잔액조회 — 합친 버전
└── combined-trade.controller.ts   # 매수/거래내역 — 합친 버전 (가장 복잡)
```

## 같은 기능의 분리된 버전 (실제 코드)

```
modules/auth/    auth.controller.ts   + auth.service.ts
modules/wallet/  wallet.controller.ts + wallet.service.ts
modules/trade/   trade.controller.ts  + trade.service.ts
```

---

## 합친 버전의 문제점

### 1. 같은 로직을 여러 곳에서 쓰기 어렵다

```
combined-trade.controller.ts의 buy() 메서드는 253줄짜리 HTTP 핸들러
→ CLI에서 같은 매수 로직을 쓰고 싶어도 Controller 통째로 가져올 수가 없음

분리된 버전:
→ trade.service.ts의 buy()만 가져다 쓰면 됨 (CLI, 스케줄러, 테스트 어디서든)
```

### 2. 테스트하기 어렵다

```typescript
// 합친 버전 테스트 — HTTP 서버, DB, Upbit API 전부 필요
const app = await NestFactory.create(...);
await request(app).post('/example/trade/buy').send(...);

// 분리된 버전 테스트 — Service만 단독으로 테스트 가능
const service = new TradeService(mockRepo, mockUpbit);
await service.buy(memberId, { market: 'KRW-BTC', volume: 0.001 });
```

### 3. 수정할 때 영향 범위가 커진다

```
"최소 주문 수량을 0.0001 → 0.001로 바꾸자"

합친 버전: buy() 메서드 찾아서 수정, 혹시 다른 곳에도 있나 전체 검색 필요
분리된 버전: trade.service.ts의 검증 한 줄만 수정, Controller는 손댈 필요 없음
```

### 4. 파일이 너무 길어진다

```
combined-trade.controller.ts: buy() 하나가 이미 70줄
→ sell(), history(), portfolio() 다 추가하면 300줄 넘는 파일이 됨

분리된 버전:
→ trade.controller.ts: 30줄 (경로/파라미터만)
→ trade.service.ts: 100줄 (로직만)
→ 각 파일이 하나의 역할에만 집중
```
