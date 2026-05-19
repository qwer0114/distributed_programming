import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MemberOrm } from '../../orm/member.orm-entity';
import { WatchlistItemOrm } from '../../orm/watchlist-item.orm-entity';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { WatchlistService } from './watchlist.service';

@UseGuards(SessionAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  list(@CurrentUser() member: MemberOrm): Promise<WatchlistItemOrm[]> {
    return this.watchlistService.list(member.id);
  }

  @Post(':market')
  toggle(@CurrentUser() member: MemberOrm, @Param('market') market: string): Promise<{ market: string; added: boolean }> {
    return this.watchlistService.toggle(member.id, market);
  }
}
