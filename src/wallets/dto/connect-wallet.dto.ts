import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class ConnectWalletDto {
  @ApiProperty({ example: 'alice.testnet', description: 'NEAR account ID' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 64, { message: 'NEAR account ID must be between 2 and 64 characters' })
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$/, {
    message: 'Must be a valid NEAR account ID or implicit account ID',
  })
  address: string;

  @ApiPropertyOptional({ example: 0, description: 'Network identifier (0 for testnet, 1 for mainnet)' })
  @IsOptional()
  @IsInt()
  chainId?: number = 0;
}
