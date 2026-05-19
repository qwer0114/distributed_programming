import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

import { MemberOrm } from '../../orm/member.orm-entity';
import { AuthService } from './auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(member: MemberOrm, done: (err: Error | null, id?: number) => void): void {
    done(null, member.id);
  }

  async deserializeUser(memberId: number, done: (err: Error | null, member?: MemberOrm | null) => void): Promise<void> {
    try {
      const member = await this.authService.findById(memberId);
      done(null, member);
    } catch (err) {
      done(err as Error);
    }
  }
}
