/**
 * 학습용: Controller + Service 합친 버전 — 매수/매도
 *
 * 문제점이 가장 잘 드러나는 예시입니다.
 * 트랜잭션 처리, 비즈니스 규칙, HTTP 파싱이 한 메서드에 뒤섞여 있습니다.
 */

import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Request } from 'express';
function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
import { HoldingCoinOrm } from '../orm/holding-coin.orm-entity';
import { TradeHistoryOrm } from '../orm/trade-history.orm-entity';
import { WalletOrm } from '../orm/wallet.orm-entity';

// 업비트 현재가 조회 (Controller 안에 직접 작성)
async function fetchCurrentPrice(market: string): Promise<number> {
  const res = await fetch(`https://api.upbit.com/v1/ticker?markets=${market}`);
  const data = await res.json() as { trade_price: number }[];
  return data[0].trade_price;
}

interface TradeBody { market: string; volume: number; }

@Controller('example/trade')
export class CombinedTradeController {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(WalletOrm) private walletRepo: Repository<WalletOrm>,
    @InjectRepository(HoldingCoinOrm) private holdingRepo: Repository<HoldingCoinOrm>,
    @InjectRepository(TradeHistoryOrm) private historyRepo: Repository<TradeHistoryOrm>,
  ) {}

  // ── 매수 ──────────────────────────────────────────────────────────────────
  @Post('buy')
  async buy(@Body() body: TradeBody, @Req() req: Request) {
    const memberId = (req.session as any).memberId;
    if (!memberId) throw new UnauthorizedException('로그인이 필요합니다.');

    // 비즈니스 규칙 검증
    if (body.volume < 0.0001) throw new BadRequestException('최소 주문 수량은 0.0001입니다.');

    // 현재가 조회 (HTTP 요청)
    const currentPrice = await fetchCurrentPrice(body.market);
    const requiredAmount = currentPrice * body.volume;
    const fee = requiredAmount * 0.0005;

    // 잔액 확인
    const wallet = await this.walletRepo.findOne({ where: { memberId } });
    if (!wallet) throw new BadRequestException('지갑을 찾을 수 없습니다.');
    if (wallet.balance - wallet.locked < requiredAmount) {
      throw new BadRequestException('잔액이 부족합니다.');
    }

    // 트랜잭션 처리 — Controller 안에 전부 들어있음
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 지갑 차감
      wallet.balance -= requiredAmount;
      await queryRunner.manager.save(WalletOrm, wallet);

      // 2. 보유코인 upsert
      const currency = body.market.replace('KRW-', '');
      const existing = await queryRunner.manager.findOne(HoldingCoinOrm, {
        where: { memberId, currency },
      });

      if (existing) {
        const newAvg = (existing.avgBuyPrice * existing.balance + currentPrice * body.volume)
          / (existing.balance + body.volume);
        existing.avgBuyPrice = newAvg;
        existing.balance += body.volume;
        existing.evalAmount = existing.balance * currentPrice;
        await queryRunner.manager.save(HoldingCoinOrm, existing);
      } else {
        const holding = queryRunner.manager.create(HoldingCoinOrm, {
          memberId,
          currency,
          balance: body.volume,
          locked: 0,
          avgBuyPrice: currentPrice,
          evalAmount: requiredAmount,
        });
        await queryRunner.manager.save(HoldingCoinOrm, holding);
      }

      // 3. 거래내역 저장
      const history = queryRunner.manager.create(TradeHistoryOrm, {
        memberId,
        uuid: uuid(),
        side: 'bid',
        ordType: 'limit',
        price: currentPrice,
        volume: body.volume,
        market: body.market,
        paidFee: fee,
        state: 'done',
      });
      await queryRunner.manager.save(TradeHistoryOrm, history);

      await queryRunner.commitTransaction();
      return { message: '매수 완료', price: currentPrice, volume: body.volume, fee };

    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('매수 처리 중 오류가 발생했습니다.');
    } finally {
      await queryRunner.release();
    }
  }

  // ── 거래내역 조회 ─────────────────────────────────────────────────────────
  @Get('history')
  async history(@Req() req: Request) {
    const memberId = (req.session as any).memberId;
    if (!memberId) throw new UnauthorizedException('로그인이 필요합니다.');

    const rows = await this.historyRepo.find({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });

    return rows.map(h => ({
      uuid: h.uuid,
      side: h.side,
      market: h.market,
      price: h.price,
      volume: h.volume,
      fee: h.paidFee,
      createdAt: h.createdAt,
    }));
  }
}
