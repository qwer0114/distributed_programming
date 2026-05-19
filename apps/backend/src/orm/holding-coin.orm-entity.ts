import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { MemberOrm } from './member.orm-entity';

@Entity('holding_coins')
export class HoldingCoinOrm {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  currency!: string;

  @Column({ type: 'float', default: 0 })
  balance!: number;

  @Column({ type: 'float', default: 0 })
  locked!: number;

  @Column({ type: 'float', default: 0 })
  avgBuyPrice!: number;

  @Column({ default: 'KRW' })
  unitCurrency!: string;

  @Column({ type: 'float', default: 0 })
  evalAmount!: number;

  @ManyToOne(() => MemberOrm, m => m.holdings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member!: MemberOrm;

  @Column()
  memberId!: number;
}
