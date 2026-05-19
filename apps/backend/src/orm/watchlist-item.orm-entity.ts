import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { MemberOrm } from './member.orm-entity';

@Entity('watchlist_items')
@Unique(['memberId', 'market'])
export class WatchlistItemOrm {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  market!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => MemberOrm, m => m.watchlistItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member!: MemberOrm;

  @Column()
  memberId!: number;
}
