import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, Length, Matches } from 'class-validator';
import { TransactionTypeDto } from './propose-transaction.dto.js';

export class RecordTransactionDto {
  @ApiProperty({ description: 'Treasury ID' })
  @IsString()
  @IsNotEmpty()
  treasuryId: string;

  @ApiProperty({
    description: 'Confirmed or submitted transaction hash on NEAR Protocol (Base58 format)',
    example: 'E4bVn9V5dCq3aK7vUf9ZtP2xM1sH4jL8rY6wQ3eA7bC',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({ example: 'alice.testnet', description: 'Sender NEAR account ID' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 64)
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$/, {
    message: 'Sender must be a valid NEAR account ID or implicit account ID',
  })
  fromAddress: string;

  @ApiProperty({ example: 'bob.testnet', description: 'Recipient NEAR account ID' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 64)
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$/, {
    message: 'Recipient must be a valid NEAR account ID or implicit account ID',
  })
  toAddress: string;

  @ApiPropertyOptional({ default: 'near', description: "Token address/account ('near' for native NEAR)" })
  @IsOptional()
  @IsString()
  tokenAddress?: string = 'near';

  @ApiPropertyOptional({ example: 'NEAR' })
  @IsOptional()
  @IsString()
  tokenSymbol?: string = 'NEAR';

  @ApiProperty({ example: '0.25' })
  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({ enum: TransactionTypeDto, default: TransactionTypeDto.TRANSFER })
  @IsOptional()
  @IsEnum(TransactionTypeDto)
  type?: TransactionTypeDto = TransactionTypeDto.TRANSFER;

  @ApiPropertyOptional({ description: 'Optional approval ID if executing an approved request' })
  @IsOptional()
  @IsString()
  approvalId?: string;
}
