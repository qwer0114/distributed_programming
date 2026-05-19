import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { MemberOrm } from '../../orm/member.orm-entity';
import { WalletOrm } from '../../orm/wallet.orm-entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(MemberOrm) private readonly memberRepo: Repository<MemberOrm>,
    @InjectRepository(WalletOrm) private readonly walletRepo: Repository<WalletOrm>,
  ) {}

  async register(dto: RegisterDto): Promise<MemberOrm> {
    const exists = await this.memberRepo.findOne({ where: { email: dto.email } });
    if (exists) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const member = this.memberRepo.create({
      email: dto.email,
      password: hashed,
      nickname: dto.nickname,
    });
    const saved = await this.memberRepo.save(member);

    const wallet = this.walletRepo.create({ memberId: saved.id, balance: 0, locked: 0 });
    await this.walletRepo.save(wallet);

    return saved;
  }

  async validateMember(email: string, password: string): Promise<MemberOrm> {
    const member = await this.memberRepo.findOne({ where: { email } });
    if (!member) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }
    const valid = await bcrypt.compare(password, member.password);
    if (!valid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }
    return member;
  }

  async findById(id: number): Promise<MemberOrm | null> {
    return this.memberRepo.findOne({ where: { id } });
  }
}
