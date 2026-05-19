import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MemberOrm } from '../../orm/member.orm-entity';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { PortfolioService, PortfolioView } from './portfolio.service';

@UseGuards(SessionAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  get(@CurrentUser() member: MemberOrm): Promise<PortfolioView> {
    return this.portfolioService.getPortfolio(member.id);
  }
}
