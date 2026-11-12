import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class NotificationsModule {}

