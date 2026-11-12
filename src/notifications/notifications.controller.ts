import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { TelegramService } from './telegram.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { IsOptional, IsString } from 'class-validator';

export class TestNotificationDto {
  @ApiPropertyOptional({
    description: 'Target Telegram chat ID. Defaults to TELEGRAM_CHAT_ID from .env if omitted',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  chatId?: string;

  @ApiPropertyOptional({
    description: 'Custom message to test Telegram bot delivery',
    example: 'Testing NearGear Telegram Transaction Alerts',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

@ApiTags('Notifications')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('telegram/status')
  @ApiOperation({ summary: 'Get Telegram notification bot status and configuration' })
  @ApiResponse({ status: 200, description: 'Telegram status' })
  getStatus() {
    return {
      configured: this.telegramService.isConfigured(),
      botName: 'NearGearBot',
      botUsername: '@NearGearAIbot',
      instructions:
        'To receive notifications, message @NearGearAIbot on Telegram, send /start, and configure your chat ID.',
    };
  }

  @Post('telegram/test')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a test notification via Telegram bot' })
  @ApiResponse({ status: 200, description: 'Notification sent' })
  async sendTestNotification(@Body() dto: TestNotificationDto) {
    const text = [
      `<b>🔔 NearGear: Test Notification</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      dto.message || `NearGear Telegram alerts are connected and functional!`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>Smart AI. Secure Treasury.</i>`,
    ].join('\n');

    const sent = await this.telegramService.sendMessage(text, dto.chatId);
    return {
      success: sent,
      message: sent
        ? 'Telegram test notification delivered successfully'
        : 'Failed to send notification. Verify TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.',
    };
  }
}

