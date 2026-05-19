import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MemberOrm } from '../../orm/member.orm-entity';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ id: number; email: string; nickname: string }> {
    const member = await this.authService.register(dto);
    return { id: member.id, email: member.email, nickname: member.nickname };
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  login(@CurrentUser() member: MemberOrm, @Body() _dto: LoginDto): { id: number; email: string; nickname: string } {
    return { id: member.id, email: member.email, nickname: member.nickname };
  }

  @UseGuards(SessionAuthGuard)
  @HttpCode(200)
  @Post('logout')
  logout(@Req() req: Request): Promise<{ message: string }> {
    return new Promise((resolve, reject) => {
      req.logout(err => {
        if (err) return reject(err);
        req.session.destroy(sessErr => {
          if (sessErr) return reject(sessErr);
          resolve({ message: '로그아웃되었습니다.' });
        });
      });
    });
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  me(@CurrentUser() member: MemberOrm): { id: number; email: string; nickname: string; createdAt: Date } {
    return { id: member.id, email: member.email, nickname: member.nickname, createdAt: member.createdAt };
  }
}
