import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';

import { HoldingCoinOrm } from '../../orm/holding-coin.orm-entity';
import { TradeHistoryOrm } from '../../orm/trade-history.orm-entity';
import { WalletOrm } from '../../orm/wallet.orm-entity';
import { UpbitService } from '../upbit/upbit.service';

const FEE_RATE = 0.0005;
const MIN_VOLUME = 0.0001;

@Injectable()
export class TradeService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly upbit: UpbitService,
  ) {}

  async buy(memberId: number, market: string, volume: number): Promise<TradeHistoryOrm> {
    if (volume < MIN_VOLUME) {
      throw new BadRequestException(`최소 주문 수량은 ${MIN_VOLUME}입니다.`);
    }
    const currentPrice = await this.upbit.getCurrentPrice(market);
    const required = currentPrice * volume;
    const currency = market.replace('KRW-', '');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const walletRepo = qr.manager.getRepository(WalletOrm);
      const holdingRepo = qr.manager.getRepository(HoldingCoinOrm);
      const historyRepo = qr.manager.getRepository(TradeHistoryOrm);

      const wallet = await walletRepo.findOne({ where: { memberId } });
      if (!wallet) throw new BadRequestException('지갑을 찾을 수 없습니다.');
      if (wallet.balance - wallet.locked < required) {
        throw new BadRequestException('잔액이 부족합니다.');
      }

      wallet.balance -= required;
      await walletRepo.save(wallet);

      const existing = await holdingRepo.findOne({ where: { memberId, currency } });
      if (existing) {
        const newAvg = (existing.avgBuyPrice * existing.balance + currentPrice * volume) / (existing.balance + volume);
        existing.avgBuyPrice = newAvg;
        existing.balance += volume;
        existing.evalAmount = existing.balance * currentPrice;
        await holdingRepo.save(existing);
      } else {
        await holdingRepo.save(holdingRepo.create({
          memberId,
          currency,
          balance: volume,
          locked: 0,
          avgBuyPrice: currentPrice,
          unitCurrency: 'KRW',
          evalAmount: required,
        }));
      }

      const fee = required * FEE_RATE;
      const history = await historyRepo.save(historyRepo.create({
        uuid: randomUUID(),
        side: 'bid',
        ordType: 'price',
        price: currentPrice,
        volume,
        market,
        paidFee: fee,
        state: 'done',
        memberId,
      }));

      await qr.commitTransaction();
      return history;
    } catch (e) {
      await qr.rollbackTransaction();
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException('매수 처리 중 오류가 발생했습니다.');
    } finally {
      await qr.release();
    }
  }

  async sell(memberId: number, market: string, volume: number): Promise<TradeHistoryOrm> {
    if (volume < MIN_VOLUME) {
      throw new BadRequestException(`최소 주문 수량은 ${MIN_VOLUME}입니다.`);
    }
    const currentPrice = await this.upbit.getCurrentPrice(market);
    const currency = market.replace('KRW-', '');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const walletRepo = qr.manager.getRepository(WalletOrm);
      const holdingRepo = qr.manager.getRepository(HoldingCoinOrm);
      const historyRepo = qr.manager.getRepository(TradeHistoryOrm);

      const holding = await holdingRepo.findOne({ where: { memberId, currency } });
      if (!holding) throw new BadRequestException('보유하지 않은 코인입니다.');
      if (holding.balance - holding.locked < volume) {
        throw new BadRequestException('보유량이 부족합니다.');
      }

      holding.balance -= volume;
      holding.evalAmount = holding.balance * currentPrice;
      if (holding.balance <= 0) {
        await holdingRepo.remove(holding);
      } else {
        await holdingRepo.save(holding);
      }

      const fee = currentPrice * volume * FEE_RATE;
      const proceeds = currentPrice * volume - fee;

      const wallet = await walletRepo.findOne({ where: { memberId } });
      if (!wallet) throw new BadRequestException('지갑을 찾을 수 없습니다.');
      wallet.balance += proceeds;
      await walletRepo.save(wallet);

      const history = await historyRepo.save(historyRepo.create({
        uuid: randomUUID(),
        side: 'ask',
        ordType: 'market',
        price: currentPrice,
        volume,
        market,
        paidFee: fee,
        state: 'done',
        memberId,
      }));

      await qr.commitTransaction();
      return history;
    } catch (e) {
      await qr.rollbackTransaction();
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException('매도 처리 중 오류가 발생했습니다.');
    } finally {
      await qr.release();
    }
  }

  async getHistory(memberId: number): Promise<TradeHistoryOrm[]> {
    const repo = this.dataSource.getRepository(TradeHistoryOrm);
    return repo.find({ where: { memberId }, order: { createdAt: 'DESC' } });
  }
}
