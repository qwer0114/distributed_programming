import { BadRequestException, Controller, Get, Query } from '@nestjs/common';

import { UpbitService } from './upbit.service';

@Controller('upbit')
export class UpbitController {
  constructor(private readonly upbit: UpbitService) {}

  @Get('markets')
  getMarkets(): Promise<unknown[]> {
    return this.upbit.getMarkets();
  }

  @Get('ticker')
  getTicker(@Query('markets') markets: string): Promise<unknown[]> {
    if (!markets) throw new BadRequestException('markets 파라미터가 필요합니다.');
    return this.upbit.getTicker(markets);
  }

  @Get('candles')
  getCandles(
    @Query('market') market: string,
    @Query('unit') unit: string,
    @Query('count') count?: string,
  ): Promise<unknown[]> {
    if (!market || !unit) throw new BadRequestException('market, unit 파라미터가 필요합니다.');
    const unitNum = parseInt(unit, 10);
    const countNum = count ? parseInt(count, 10) : 200;
    if (isNaN(unitNum) || isNaN(countNum)) throw new BadRequestException('unit, count는 숫자여야 합니다.');
    return this.upbit.getCandles(market, unitNum, countNum);
  }

  @Get('orderbook')
  getOrderBook(@Query('markets') markets: string): Promise<unknown[]> {
    if (!markets) throw new BadRequestException('markets 파라미터가 필요합니다.');
    return this.upbit.getOrderBook(markets);
  }
}
