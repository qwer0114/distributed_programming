import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MemberOrm } from '../../orm/member.orm-entity';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ChargeDto } from './dto/charge.dto';
import { WalletService } from './wallet.service';

@UseGuards(SessionAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async get(@CurrentUser() member: MemberOrm): Promise<{ currency: string; balance: number; locked: number; availableBalance: number }> {
    const wallet = await this.walletService.getByMemberId(member.id);
    return {
      currency: 'KRW',
      balance: wallet.balance,
      locked: wallet.locked,
      availableBalance: wallet.balance - wallet.locked,
    };
  }

  @Post('charge')
  async charge(@CurrentUser() member: MemberOrm, @Body() dto: ChargeDto): Promise<{ balance: number; locked: number }> {
    const wallet = await this.walletService.charge(member.id, dto.amount);
    return { balance: wallet.balance, locked: wallet.locked };
  }
}
