import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MemberOrm } from '../../orm/member.orm-entity';
import { TradeHistoryOrm } from '../../orm/trade-history.orm-entity';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { TradeDto } from './dto/trade.dto';
import { TradeService } from './trade.service';

@UseGuards(SessionAuthGuard)
@Controller('trade')
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Post('buy')
  buy(@CurrentUser() member: MemberOrm, @Body() dto: TradeDto): Promise<TradeHistoryOrm> {
    return this.tradeService.buy(member.id, dto.market, dto.volume);
  }

  @Post('sell')
  sell(@CurrentUser() member: MemberOrm, @Body() dto: TradeDto): Promise<TradeHistoryOrm> {
    return this.tradeService.sell(member.id, dto.market, dto.volume);
  }

  @Get('history')
  history(@CurrentUser() member: MemberOrm): Promise<TradeHistoryOrm[]> {
    return this.tradeService.getHistory(member.id);
  }
}
