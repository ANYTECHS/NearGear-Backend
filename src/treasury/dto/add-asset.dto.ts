import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class AddAssetDto {
  @ApiProperty({
    description: "NEP-141 token contract account ID (e.g. wrap.testnet) or 'near' for native NEAR",
    example: 'wrap.testnet',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 64)
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$|^near$/, {
    message: "Must be a valid NEAR account ID or 'near'",
  })
  tokenAddress: string;
}
