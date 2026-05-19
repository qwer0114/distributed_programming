import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { MemberOrm } from '../../orm/member.orm-entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MemberOrm => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as MemberOrm;
  },
);
