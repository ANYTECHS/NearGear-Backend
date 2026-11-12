import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentService } from './agent.service.js';
import { AgentController } from './agent.controller.js';
import { AgentAiService } from './agent-ai.service.js';
import { AgentAnalysisService } from './agent-analysis.service.js';
import { AgentPermissionsService } from './agent-permissions.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TreasuryModule } from '../treasury/treasury.module.js';
import { BlockchainModule } from '../blockchain/blockchain.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    TreasuryModule,
    BlockchainModule,
    NotificationsModule,
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentAiService,
    AgentAnalysisService,
    AgentPermissionsService,
  ],
  exports: [
    AgentService,
    AgentAiService,
    AgentAnalysisService,
    AgentPermissionsService,
  ],
})
export class AgentModule {}
