/**
 * 학습용: Controller + Service 합친 버전
 *
 * 실제 프로젝트에서는 이렇게 쓰지 않습니다.
 * 비교를 위해 비즈니스 로직을 Controller 안에 직접 작성한 예시입니다.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { MemberOrm } from '../orm/member.orm-entity';
import { WalletOrm } from '../orm/wallet.orm-entity';

// DTO도 별도 파일 없이 인터페이스로 인라인 정의
interface RegisterBody { email: string; password: string; nickname: string; }
interface LoginBody    { email: string; password: string; }

@Controller('example/auth')
export class CombinedAuthController {
  // Service 없이 Repository를 Controller가 직접 주입받음
  constructor(
    @InjectRepository(MemberOrm) private memberRepo: Repository<MemberOrm>,
    @InjectRepository(WalletOrm) private walletRepo: Repository<WalletOrm>,
  ) {}

  // ── 회원가입 ──────────────────────────────────────────────────────────────
  @Post('register')
  async register(@Body() body: RegisterBody) {
    // Controller 안에 비즈니스 로직이 그대로 있음
    const exists = await this.memberRepo.findOne({ where: { email: body.email } });
    if (exists) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    const hashed = await bcrypt.hash(body.password, 10);

    const member = this.memberRepo.create({
      email: body.email,
      password: hashed,
      nickname: body.nickname,
    });
    const saved = await this.memberRepo.save(member);

    const wallet = this.walletRepo.create({ memberId: saved.id, balance: 0, locked: 0 });
    await this.walletRepo.save(wallet);

    return { id: saved.id, email: saved.email, nickname: saved.nickname };
  }

  // ── 로그인 ────────────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginBody, @Req() req: Request) {
    const member = await this.memberRepo.findOne({ where: { email: body.email } });
    if (!member) throw new UnauthorizedException('존재하지 않는 이메일입니다.');

    const match = await bcrypt.compare(body.password, member.password);
    if (!match) throw new UnauthorizedException('비밀번호가 틀렸습니다.');

    // 세션에 직접 저장
    (req.session as any).memberId = member.id;

    return { message: '로그인 성공', nickname: member.nickname };
  }

  // ── 로그아웃 ──────────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.json({ message: '로그아웃 완료' });
    });
  }

  // ── 내 정보 ───────────────────────────────────────────────────────────────
  @Get('me')
  async me(@Req() req: Request) {
    const memberId = (req.session as any).memberId;
    if (!memberId) throw new UnauthorizedException('로그인이 필요합니다.');

    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new UnauthorizedException('유효하지 않은 세션입니다.');

    return { id: member.id, email: member.email, nickname: member.nickname };
  }
}
