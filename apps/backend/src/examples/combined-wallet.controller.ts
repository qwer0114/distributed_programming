/**
 * 학습용: Controller + Service 합친 버전 — 지갑
 */

import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { WalletOrm } from '../orm/wallet.orm-entity';

interface ChargeBody { amount: number; }

@Controller('example/wallet')
export class CombinedWalletController {
  constructor(
    @InjectRepository(WalletOrm) private walletRepo: Repository<WalletOrm>,
  ) {}

  // ── 충전 ──────────────────────────────────────────────────────────────────
  @Post('charge')
  async charge(@Body() body: ChargeBody, @Req() req: Request) {
    const memberId = (req.session as any).memberId;
    if (!memberId) throw new UnauthorizedException('로그인이 필요합니다.');

    // 비즈니스 규칙이 Controller 안에 있음
    if (!body.amount || body.amount < 10_000) {
      throw new BadRequestException('최소 충전 금액은 10,000원입니다.');
    }

    const wallet = await this.walletRepo.findOne({ where: { memberId } });
    if (!wallet) throw new BadRequestException('지갑을 찾을 수 없습니다.');

    wallet.balance += body.amount;
    await this.walletRepo.save(wallet);

    return { balance: wallet.balance, locked: wallet.locked };
  }

  // ── 잔액 조회 ─────────────────────────────────────────────────────────────
  @Get()
  async getWallet(@Req() req: Request) {
    const memberId = (req.session as any).memberId;
    if (!memberId) throw new UnauthorizedException('로그인이 필요합니다.');

    const wallet = await this.walletRepo.findOne({ where: { memberId } });
    if (!wallet) throw new BadRequestException('지갑을 찾을 수 없습니다.');

    return {
      currency: 'KRW',
      balance: wallet.balance,
      locked: wallet.locked,
      available: wallet.balance - wallet.locked,
    };
  }
}
