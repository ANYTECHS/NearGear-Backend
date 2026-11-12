import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, Length, Matches } from 'class-validator';

export enum TransactionTypeDto {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  TRANSFER = 'TRANSFER',
  APPROVAL = 'APPROVAL',
  CONTRACT_EXECUTION = 'CONTRACT_EXECUTION',
}

export class ProposeTransactionDto {
  @ApiProperty({ description: 'Treasury ID' })
  @IsString()
  @IsNotEmpty()
  treasuryId: string;

  @ApiProperty({
    description: 'Target recipient NEAR account ID',
    example: 'bob.testnet',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 64)
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$/, {
    message: 'Recipient must be a valid NEAR account ID or implicit account ID',
  })
  toAddress: string;

  @ApiPropertyOptional({
    description: "Token address/account (default 'near' for native NEAR, or NEP-141 contract account ID)",
    default: 'near',
  })
  @IsOptional()
  @IsString()
  tokenAddress?: string = 'near';

  @ApiPropertyOptional({ example: 'NEAR' })
  @IsOptional()
  @IsString()
  tokenSymbol?: string = 'NEAR';

  @ApiProperty({ example: '1.5', description: 'Amount in human-readable formatted units' })
  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({ enum: TransactionTypeDto, default: TransactionTypeDto.TRANSFER })
  @IsOptional()
  @IsEnum(TransactionTypeDto)
  type?: TransactionTypeDto = TransactionTypeDto.TRANSFER;

  @ApiPropertyOptional({ example: 'Transfer funds for monthly server hosting' })
  @IsOptional()
  @IsString()
  reason?: string;
}
