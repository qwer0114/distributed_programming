import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WalletOrm } from '../../orm/wallet.orm-entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletOrm) private readonly walletRepo: Repository<WalletOrm>,
  ) {}

  async getByMemberId(memberId: number): Promise<WalletOrm> {
    const wallet = await this.walletRepo.findOne({ where: { memberId } });
    if (!wallet) throw new NotFoundException('지갑을 찾을 수 없습니다.');
    return wallet;
  }

  async charge(memberId: number, amount: number): Promise<WalletOrm> {
    const wallet = await this.getByMemberId(memberId);
    wallet.balance += amount;
    return this.walletRepo.save(wallet);
  }
}
