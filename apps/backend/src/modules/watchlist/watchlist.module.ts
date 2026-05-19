import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WatchlistItemOrm } from '../../orm/watchlist-item.orm-entity';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [TypeOrmModule.forFeature([WatchlistItemOrm])],
  controllers: [WatchlistController],
  providers: [WatchlistService],
})
export class WatchlistModule {}
