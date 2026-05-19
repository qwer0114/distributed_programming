import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HoldingCoinOrm } from '../../orm/holding-coin.orm-entity';
import { TradeHistoryOrm } from '../../orm/trade-history.orm-entity';
import { WalletOrm } from '../../orm/wallet.orm-entity';
import { UpbitModule } from '../upbit/upbit.module';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletOrm, HoldingCoinOrm, TradeHistoryOrm]),
    UpbitModule,
  ],
  controllers: [TradeController],
  providers: [TradeService],
})
export class TradeModule {}
