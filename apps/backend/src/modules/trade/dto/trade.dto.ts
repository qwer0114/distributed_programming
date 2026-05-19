import { IsNumber, IsString, Matches, Min } from 'class-validator';

export class TradeDto {
  @IsString()
  @Matches(/^[A-Z]+-[A-Z0-9]+$/, { message: '마켓 코드 형식이 올바르지 않습니다.' })
  market!: string;

  @IsNumber()
  @Min(0.0001, { message: '최소 주문 수량은 0.0001입니다.' })
  volume!: number;
}
