import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateTreasuryDto {
  @ApiPropertyOptional({ example: 'Updated Treasury Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'treasury.neargear.testnet' })
  @IsOptional()
  @IsString()
  @Length(2, 64)
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$/, {
    message: 'Contract address must be a valid NEAR account ID',
  })
  contractAddress?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
