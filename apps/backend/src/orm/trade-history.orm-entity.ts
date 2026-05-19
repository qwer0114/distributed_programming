import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { MemberOrm } from './member.orm-entity';

@Entity('trade_histories')
export class TradeHistoryOrm {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  uuid!: string;

  @Column()
  side!: 'bid' | 'ask';

  @Column()
  ordType!: string;

  @Column({ type: 'float' })
  price!: number;

  @Column({ type: 'float' })
  volume!: number;

  @Column()
  market!: string;

  @Column({ type: 'float', default: 0 })
  paidFee!: number;

  @Column({ default: 'done' })
  state!: 'done' | 'cancel' | 'wait';

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => MemberOrm, m => m.tradeHistories, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'memberId' })
  member!: MemberOrm | null;

  @Column({ nullable: true })
  memberId!: number | null;
}
