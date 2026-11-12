import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/neondb';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      this.logger.warn('DATABASE_URL is not set. Prisma connection skipped.');
      return;
    }
    this.logger.log('Connecting to Prisma...');
    try {
      await this.$connect();
      this.logger.log('Prisma connected successfully to Neon PostgreSQL');
    } catch (err) {
      this.logger.error('Prisma connection failed:', err);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      if (this.pool) {
        await this.pool.end();
      }
    } catch (err) {
      this.logger.debug(`Error closing Prisma pool: ${err.message}`);
    }
  }
}
