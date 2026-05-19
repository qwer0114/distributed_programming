import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { HoldingCoinOrm } from './holding-coin.orm-entity';
import { TradeHistoryOrm } from './trade-history.orm-entity';
import { WalletOrm } from './wallet.orm-entity';
import { WatchlistItemOrm } from './watchlist-item.orm-entity';

@Entity('members')
export class MemberOrm {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  nickname!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToOne(() => WalletOrm, w => w.member, { cascade: true })
  wallet!: WalletOrm;

  @OneToMany(() => HoldingCoinOrm, h => h.member, { cascade: true })
  holdings!: HoldingCoinOrm[];

  @OneToMany(() => TradeHistoryOrm, t => t.member)
  tradeHistories!: TradeHistoryOrm[];

  @OneToMany(() => WatchlistItemOrm, w => w.member, { cascade: true })
  watchlistItems!: WatchlistItemOrm[];
}
