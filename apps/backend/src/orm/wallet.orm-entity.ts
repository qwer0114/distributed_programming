import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { MemberOrm } from './member.orm-entity';

@Entity('wallets')
export class WalletOrm {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'float', default: 0 })
  balance!: number;

  @Column({ type: 'float', default: 0 })
  locked!: number;

  @OneToOne(() => MemberOrm, m => m.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member!: MemberOrm;

  @Column()
  memberId!: number;
}
