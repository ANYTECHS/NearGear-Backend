import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class GetNonceDto {
  @ApiProperty({
    description: 'NEAR account ID to authenticate (e.g. alice.testnet or 64-char hex account)',
    example: 'alice.testnet',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 64, { message: 'NEAR account ID must be between 2 and 64 characters' })
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$/, {
    message: 'Address must be a valid NEAR account ID or implicit account ID',
  })
  address: string;
}
