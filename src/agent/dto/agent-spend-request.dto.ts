import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class AgentSpendRequestDto {
  @ApiProperty({
    description: 'Target Treasury ID',
    example: 'cm123abc...',
  })
  @IsString()
  @IsNotEmpty()
  treasuryId: string;

  @ApiProperty({
    description: 'AI Agent NEAR account ID making the spending request',
    example: 'compute-agent.testnet',
  })
  @IsString()
  @IsNotEmpty()
  agentAccountId: string;

  @ApiProperty({
    description: 'Destination wallet address for the payment',
    example: 'hosting-provider.testnet',
  })
  @IsString()
  @IsNotEmpty()
  recipientAddress: string;

  @ApiProperty({
    description: 'Payment amount in NEAR',
    example: '3.5',
  })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description:
      'Task or service category (e.g. cloud_hosting, research_apis, compute_resources)',
    example: 'cloud_hosting',
  })
  @IsString()
  @IsNotEmpty()
  task: string;

  @ApiPropertyOptional({
    description: 'Token symbol (defaults to NEAR)',
    default: 'NEAR',
  })
  @IsOptional()
  @IsString()
  tokenSymbol?: string;

  @ApiPropertyOptional({
    description: 'Detailed explanation, invoice ID, or reason for the payment',
    example: 'Monthly Kubernetes cluster compute fee for data collection node',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

