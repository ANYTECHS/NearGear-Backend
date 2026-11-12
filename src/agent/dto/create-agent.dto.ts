import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateAgentDto {
  @ApiProperty({
    description: 'Human-readable name of the AI agent',
    example: 'Computing & Research Agent',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'NEAR account ID of the AI agent',
    example: 'compute-agent.testnet',
  })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiPropertyOptional({
    description: 'Assigned functional role for this agent',
    example: 'CLOUD_AND_APIS',
  })
  @IsOptional()
  @IsString()
  role?: string;

  // --- 1. Approved Recipient Permission ---
  @ApiPropertyOptional({
    description:
      'List of approved recipient wallet addresses this agent is allowed to pay',
    example: ['hosting-provider.testnet', 'research-api.testnet'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approvedRecipients?: string[];

  @ApiPropertyOptional({
    description: 'Whether recipient whitelist enforcement is enabled',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enforceWhitelist?: boolean;

  // --- 2. Transaction Approval Permission ---
  @ApiPropertyOptional({
    description:
      'Maximum amount (in NEAR) that can be spent instantly without human owner approval. Payments above this require human approval.',
    example: '5.0',
    default: '5.0',
  })
  @IsOptional()
  @IsNumberString()
  instantSpendingLimit?: string;

  @ApiPropertyOptional({
    description: 'Maximum daily spending limit in NEAR (24-hour rolling cap)',
    example: '20.0',
    default: '20.0',
  })
  @IsOptional()
  @IsNumberString()
  dailySpendingLimit?: string;

  // --- 3. Task-Based Permission ---
  @ApiPropertyOptional({
    description:
      'List of authorized task or service categories the agent is allowed to spend on',
    example: ['cloud_hosting', 'research_apis', 'compute_resources'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approvedTasks?: string[];

  @ApiPropertyOptional({
    description: 'Whether task-based permission whitelist is enforced',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enforceTaskWhitelist?: boolean;

  // --- 4. Time-Based Permission ---
  @ApiPropertyOptional({
    description: 'Whether time-window spending restriction is enabled',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  timeWindowEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Start hour in UTC (0-23) for approved spending window',
    example: 8,
    default: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHourUtc?: number;

  @ApiPropertyOptional({
    description: 'End hour in UTC (0-23) for approved spending window',
    example: 18,
    default: 18,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  endHourUtc?: number;

  @ApiPropertyOptional({
    description:
      'Approved days of week (0=Sunday, 1=Monday ... 6=Saturday). Defaults to weekdays [1,2,3,4,5]',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  allowedDaysOfWeek?: number[];
}

