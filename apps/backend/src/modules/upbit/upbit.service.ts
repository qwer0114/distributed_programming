import { Injectable, ServiceUnavailableException } from '@nestjs/common';

interface UpbitTickerRaw {
  market: string;
  trade_price: number;
  [key: string]: unknown;
}

@Injectable()
export class UpbitService {
  private readonly BASE = 'https://api.upbit.com/v1';

  private async get<T>(path: string): Promise<T> {
    try {
      const res = await fetch(`${this.BASE}${path}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        throw new ServiceUnavailableException(`Upbit API 오류: ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      throw new ServiceUnavailableException('Upbit API에 연결할 수 없습니다.');
    }
  }

  getMarkets(): Promise<unknown[]> {
    return this.get(`/market/all?isDetails=false`);
  }

  getTicker(markets: string): Promise<UpbitTickerRaw[]> {
    return this.get<UpbitTickerRaw[]>(`/ticker?markets=${markets}`);
  }

  getCandles(market: string, unit: number, count: number = 200): Promise<unknown[]> {
    return this.get(`/candles/minutes/${unit}?market=${market}&count=${count}`);
  }

  getOrderBook(markets: string): Promise<unknown[]> {
    return this.get(`/orderbook?markets=${markets}`);
  }

  async getCurrentPrice(market: string): Promise<number> {
    const tickers = await this.getTicker(market);
    if (!tickers[0]) {
      throw new ServiceUnavailableException(`현재가 조회 실패: ${market}`);
    }
    return tickers[0].trade_price;
  }
}
