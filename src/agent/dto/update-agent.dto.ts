import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateAgentDto {
  @ApiPropertyOptional({ description: 'Human-readable name of the AI agent' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'NEAR account ID of the AI agent' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Assigned functional role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Whether the agent is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // --- 1. Approved Recipient Permission ---
  @ApiPropertyOptional({
    description: 'Approved recipient wallet addresses',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approvedRecipients?: string[];

  @ApiPropertyOptional({
    description: 'Whether recipient whitelist enforcement is enabled',
  })
  @IsOptional()
  @IsBoolean()
  enforceWhitelist?: boolean;

  // --- 2. Transaction Approval Permission ---
  @ApiPropertyOptional({
    description:
      'Maximum amount (in NEAR) that can be spent instantly without human owner approval. Payments above this require human approval.',
  })
  @IsOptional()
  @IsNumberString()
  instantSpendingLimit?: string;

  @ApiPropertyOptional({
    description: 'Maximum daily spending limit in NEAR (24-hour rolling cap)',
  })
  @IsOptional()
  @IsNumberString()
  dailySpendingLimit?: string;

  // --- 3. Task-Based Permission ---
  @ApiPropertyOptional({
    description: 'List of authorized task or service categories',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approvedTasks?: string[];

  @ApiPropertyOptional({
    description: 'Whether task-based permission whitelist is enforced',
  })
  @IsOptional()
  @IsBoolean()
  enforceTaskWhitelist?: boolean;

  // --- 4. Time-Based Permission ---
  @ApiPropertyOptional({
    description: 'Whether time-window spending restriction is enabled',
  })
  @IsOptional()
  @IsBoolean()
  timeWindowEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Start hour in UTC (0-23)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHourUtc?: number;

  @ApiPropertyOptional({ description: 'End hour in UTC (0-23)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  endHourUtc?: number;

  @ApiPropertyOptional({
    description: 'Approved days of week (0=Sunday ... 6=Saturday)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  allowedDaysOfWeek?: number[];
}

