# 비트코인 프로젝트 - 업비트 API 연동 가이드

## 📚 공식 문서 참조

> Claude Code에서 특정 API 구현 시 아래 .md URL을 @로 참조할 것

- **전체 문서 목록**: https://docs.upbit.com/kr/llms.txt
- **인증 가이드**: https://docs.upbit.com/kr/reference/auth.md
- **REST API 가이드**: https://docs.upbit.com/kr/reference/rest-api-guide.md
- **WebSocket 가이드**: https://docs.upbit.com/kr/reference/websocket-guide.md
- **Rate Limits**: https://docs.upbit.com/kr/reference/rate-limits.md
- **WebSocket Best Practice**: https://docs.upbit.com/kr/docs/websocket-best-practice.md
- **REST Best Practice**: https://docs.upbit.com/kr/docs/rest-api-best-practice.md

---

## 🏗️ 프로젝트 스택

- Framework: React + TypeScript + Vite
- 상태관리: jotai
- 서버상태: TanStack Query
- HTTP: fetch

---

## 🔐 인증 방식 (JWT HS512)

> 참조 문서: https://docs.upbit.com/kr/reference/auth.md

업비트는 **JWT(HS512)** 기반 인증 사용. 인증이 필요한 API(Exchange API, 인증 WebSocket)는
매 요청마다 새로운 JWT 토큰 생성 필요.

### 환경변수

```
VITE_UPBIT_ACCESS_KEY=your_access_key
VITE_UPBIT_SECRET_KEY=your_secret_key  # 절대 노출 금지
```

### JWT 생성 패턴 (src/lib/auth.ts)

```typescript
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const ACCESS_KEY = import.meta.env.VITE_UPBIT_ACCESS_KEY;
const SECRET_KEY = import.meta.env.VITE_UPBIT_SECRET_KEY;

// 쿼리 파라미터 → 문자열 변환 (배열 파라미터 지원)
export function buildQueryString(params: Record<string, unknown>): {
  encoded: string;
  raw: string;
} {
  const encoded = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((v) => [key, String(v)])
        : [[key, String(value)]],
    ),
  ).toString();
  return { encoded, raw: decodeURIComponent(encoded) };
}

// JWT 토큰 생성 - 쿼리 파라미터 있을 때는 SHA512 해시 포함
export function createJwtToken(queryString = ""): string {
  const payload: Record<string, string> = {
    access_key: ACCESS_KEY,
    nonce: uuidv4(),
  };
  if (queryString) {
    payload.query_hash = crypto
      .createHash("sha512")
      .update(queryString, "utf8")
      .digest("hex");
    payload.query_hash_alg = "SHA512";
  }
  return jwt.sign(payload, SECRET_KEY, { algorithm: "HS512" });
}
```

### API 호출 패턴 (src/api/upbitClient.ts)

```typescript
import axios from "axios";
import { buildQueryString, createJwtToken } from "@/lib/auth";

const BASE_URL = "https://api.upbit.com/v1";

// 인증 불필요 (시세 조회)
export const publicApi = axios.create({ baseURL: BASE_URL });

// 인증 필요 (계정, 주문)
export async function privateGet<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  let token: string;
  let queryStr = "";

  if (params) {
    const { encoded, raw } = buildQueryString(params);
    queryStr = raw;
    const res = await axios.get<T>(`${BASE_URL}${path}?${encoded}`, {
      headers: { Authorization: `Bearer ${createJwtToken(queryStr)}` },
    });
    return res.data;
  }

  const res = await axios.get<T>(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${createJwtToken()}` },
  });
  return res.data;
}

export async function privatePost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { raw } = buildQueryString(body);
  const res = await axios.post<T>(`${BASE_URL}${path}`, body, {
    headers: {
      Authorization: `Bearer ${createJwtToken(raw)}`,
      "Content-Type": "application/json",
    },
  });
  return res.data;
}
```

---

## 🌐 REST API 주요 엔드포인트

> 참조: https://docs.upbit.com/kr/reference/list-tickers.md

| 목적           | 인증 | Method | Path                                          |
| -------------- | ---- | ------ | --------------------------------------------- |
| 현재가 조회    | ❌   | GET    | `/ticker?markets=KRW-BTC`                     |
| 호가창 조회    | ❌   | GET    | `/orderbook?markets=KRW-BTC`                  |
| 분 캔들 조회   | ❌   | GET    | `/candles/minutes/1?market=KRW-BTC&count=200` |
| 일 캔들 조회   | ❌   | GET    | `/candles/days?market=KRW-BTC&count=30`       |
| 계정 잔고      | ✅   | GET    | `/accounts`                                   |
| 주문 생성      | ✅   | POST   | `/orders`                                     |
| 대기 주문 목록 | ✅   | GET    | `/orders/open`                                |
| 주문 취소      | ✅   | DELETE | `/order?uuid={uuid}`                          |

---

## 📡 WebSocket 연결

> 참조: https://docs.upbit.com/kr/reference/websocket-guide.md

### 연결 기본 정보

- **URL**: `wss://api.upbit.com/websocket/v1`
- **Blob 응답**: 모든 메시지는 Blob 형태로 수신 → text() 변환 필수
- **인증 WebSocket** (MyAsset, MyOrder): ping 메시지 포함 필요

### 시세 WebSocket 구독 타입

| type                   | 설명          | 인증 필요 |
| ---------------------- | ------------- | --------- |
| `ticker`               | 실시간 현재가 | ❌        |
| `orderbook`            | 실시간 호가창 | ❌        |
| `trade`                | 실시간 체결   | ❌        |
| `candle.{1s\|1m\|...}` | 실시간 캔들   | ❌        |
| `myAsset`              | 내 자산 변화  | ✅        |
| `myOrder`              | 내 주문/체결  | ✅        |

### WebSocket 훅 패턴 (src/hooks/useUpbitSocket.ts)

```typescript
import { useEffect, useRef } from "react";

type SocketType = "ticker" | "orderbook" | "trade";

interface UseUpbitSocketOptions<T> {
  type: SocketType;
  codes: string[]; // ex) ['KRW-BTC', 'KRW-ETH']
  onMessage: (data: T) => void;
  isOnlyRealtime?: boolean;
}

export function useUpbitSocket<T>({
  type,
  codes,
  onMessage,
  isOnlyRealtime = true,
}: UseUpbitSocketOptions<T>) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket("wss://api.upbit.com/websocket/v1");
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify([
            { ticket: crypto.randomUUID() },
            { type, codes, isOnlyRealtime },
            { format: "DEFAULT" }, // SIMPLE = 축약 필드명
          ]),
        );
      };

      ws.onmessage = async (e: MessageEvent<Blob>) => {
        const text = await e.data.text(); // ⚠️ Blob → text 변환 필수
        onMessage(JSON.parse(text) as T);
      };

      ws.onerror = (e) => console.error("[WS Error]", e);

      // 자동 재연결 (3초 후)
      ws.onclose = () => {
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [type, codes.join(",")]);
}
```

### 사용 예시

```typescript
// BTC 실시간 현재가
useUpbitSocket<UpbitTicker>({
  type: "ticker",
  codes: ["KRW-BTC"],
  onMessage: (data) => useTickerStore.getState().setTicker(data),
});
```

---

## 🗂️ 파일 구조 규칙

```
src/
├── api/
│   ├── upbitClient.ts   # axios 인스턴스, privateGet/Post
│   ├── ticker.ts        # 현재가 REST API
│   ├── orders.ts        # 주문 관련 REST API
│   └── accounts.ts      # 계정 관련 REST API
├── hooks/
│   ├── useUpbitSocket.ts  # WebSocket 공통 훅
│   ├── useTicker.ts       # 현재가 구독
│   └── useOrderBook.ts    # 호가창 구독
├── lib/
│   └── auth.ts          # JWT 생성 로직
└── store/
    ├── tickerStore.ts   # 실시간 시세 Zustand store
    └── orderStore.ts    # 주문 상태 Zustand store
```

---

## ⚠️ 코딩 컨벤션 및 주의사항

1. **컴포넌트에서 직접 fetch 금지** → 반드시 `src/api/` 훅 또는 함수 통해서
2. **WebSocket Blob 변환 필수** → `await e.data.text()` 누락 시 JSON 파싱 에러
3. **SECRET_KEY 절대 클라이언트 노출 금지** → 실제 주문 API는 백엔드 프록시 경유 권장
4. **쿼리 파라미터 있는 요청** → `buildQueryString().raw`로 SHA512 해시 생성 필수
5. **Rate Limit** → 초당 요청 제한 있음, 참조: https://docs.upbit.com/kr/reference/rate-limits.md
6. **WebSocket 재연결** → `onclose`에서 반드시 재연결 로직 구현
