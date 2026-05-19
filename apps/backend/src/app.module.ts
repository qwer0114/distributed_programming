import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HoldingCoinOrm } from './orm/holding-coin.orm-entity';
import { MemberOrm } from './orm/member.orm-entity';
import { TradeHistoryOrm } from './orm/trade-history.orm-entity';
import { WalletOrm } from './orm/wallet.orm-entity';
import { WatchlistItemOrm } from './orm/watchlist-item.orm-entity';
import { AuthModule } from './modules/auth/auth.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { TradeModule } from './modules/trade/trade.module';
import { UpbitModule } from './modules/upbit/upbit.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? 'coin.db',
      entities: [MemberOrm, WalletOrm, HoldingCoinOrm, TradeHistoryOrm, WatchlistItemOrm],
      synchronize: true,
    }),
    AuthModule,
    WalletModule,
    TradeModule,
    PortfolioModule,
    WatchlistModule,
    UpbitModule,
  ],
})
export class AppModule {}
