import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service.js';
import { ContractService } from './contract.service.js';
import { NearService } from './near.service.js';

@Module({
  imports: [ConfigModule],
  providers: [BlockchainService, ContractService, NearService],
  exports: [BlockchainService, ContractService, NearService],
})
export class BlockchainModule { }
