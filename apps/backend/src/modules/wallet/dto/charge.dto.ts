import { IsNumber, Min } from 'class-validator';

export class ChargeDto {
  @IsNumber()
  @Min(10_000, { message: '최소 충전 금액은 10,000원입니다.' })
  amount!: number;
}
