"use client";

import { useEffect, useRef } from "react";

type SocketType = "ticker" | "orderbook" | "trade";
export type SocketStatus = "connecting" | "connected";

interface UseUpbitSocketOptions<T> {
  type: SocketType;
  codes: string[];
  onMessage: (data: T) => void;
  onStatusChange?: (status: SocketStatus) => void;
  isOnlyRealtime?: boolean;
}

export function useUpbitSocket<T>({
  type,
  codes,
  onMessage,
  onStatusChange,
  isOnlyRealtime = false,
}: UseUpbitSocketOptions<T>) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  });

  useEffect(() => {
    if (codes.length === 0) return;

    const connect = () => {
      onStatusChangeRef.current?.("connecting");
      const ws = new WebSocket("wss://api.upbit.com/websocket/v1");
      wsRef.current = ws;

      ws.onopen = () => {
        onStatusChangeRef.current?.("connected");
        ws.send(
          JSON.stringify([
            { ticket: crypto.randomUUID() },
            { type, codes, isOnlyRealtime },
            { format: "DEFAULT" },
          ]),
        );
      };

      ws.onmessage = async (e: MessageEvent<Blob>) => {
        const text = await e.data.text();
        onMessageRef.current(JSON.parse(text) as T);
      };

      ws.onerror = (e) => console.error("[WS Error]", e);

      ws.onclose = () => {
        onStatusChangeRef.current?.("connecting");
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
    // codes.join(",") 으로 의존성 관리하여 코드 변경 시에만 재연결
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, codes.join(","), isOnlyRealtime]);
}
