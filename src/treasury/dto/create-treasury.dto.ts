import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateTreasuryDto {
  @ApiProperty({ example: 'Company Operations Treasury' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Wallet ID belonging to the user to associate as primary treasury wallet',
  })
  @IsOptional()
  @IsString()
  walletId?: string;

  @ApiPropertyOptional({
    description: 'TreasuryVault smart contract account ID on NEAR Protocol',
    example: 'treasury.neargear.testnet',
  })
  @IsOptional()
  @IsString()
  @Length(2, 64)
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$/, {
    message: 'Contract address must be a valid NEAR account ID',
  })
  contractAddress?: string;

  @ApiPropertyOptional({ example: 0, description: '0 for testnet, 1 for mainnet' })
  @IsOptional()
  @IsInt()
  chainId?: number = 0;
}
