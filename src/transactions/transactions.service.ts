import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BlockchainService } from '../blockchain/blockchain.service.js';
import { NearService } from '../blockchain/near.service.js';
import { TelegramService } from '../notifications/telegram.service.js';
import { ProposeTransactionDto } from './dto/propose-transaction.dto.js';
import { RecordTransactionDto } from './dto/record-transaction.dto.js';
import { QueryTransactionsDto } from './dto/query-transactions.dto.js';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
    private nearService: NearService,
    private telegramService: TelegramService,
  ) {}

  private async verifyTreasuryAccess(treasuryId: string, userId: string) {
    const treasury = await this.prisma.treasury.findUnique({
      where: { id: treasuryId },
    });

    if (!treasury) {
      throw new NotFoundException('Treasury not found');
    }

    if (treasury.ownerId !== userId) {
      throw new ForbiddenException('Access denied to this treasury');
    }

    return treasury;
  }

  async proposeTransaction(userId: string, dto: ProposeTransactionDto) {
    const treasury = await this.verifyTreasuryAccess(dto.treasuryId, userId);
    const toAddress = this.nearService.normalizeAccountId(dto.toAddress);
    const tokenAddress = dto.tokenAddress
      ? (dto.tokenAddress.toLowerCase() === 'near' ? 'near' : this.nearService.normalizeAccountId(dto.tokenAddress))
      : 'near';

    if (parseFloat(dto.amount) <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Create an Approval proposal record
    const approval = await this.prisma.approval.create({
      data: {
        treasuryId: treasury.id,
        actionType: dto.type || 'TRANSFER',
        recipientAddress: toAddress,
        tokenAddress,
        tokenSymbol: dto.tokenSymbol || 'NEAR',
        amount: dto.amount,
        reason: dto.reason || 'Manual user proposal',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
    });

    // Send Telegram alert
    this.telegramService
      .notifyTransactionProposed({
        treasuryName: treasury.name,
        actionType: dto.type || 'TRANSFER',
        amount: dto.amount,
        tokenSymbol: dto.tokenSymbol || 'NEAR',
        recipientAddress: toAddress,
        reason: dto.reason,
        approvalId: approval.id,
      })
      .catch((err) => this.logger.warn(`Telegram error: ${err.message}`));

    return {
      message: 'Transaction proposal created and pending user approval',
      approval,
    };
  }

  async recordTransaction(userId: string, dto: RecordTransactionDto) {
    const treasury = await this.verifyTreasuryAccess(dto.treasuryId, userId);
    const txHash = dto.txHash;

    // Check if transaction already exists (idempotency)
    const existing = await this.prisma.transaction.findUnique({
      where: { txHash },
    });

    if (existing) {
      return existing;
    }

    const fromAddress = this.nearService.normalizeAccountId(dto.fromAddress);
    const toAddress = this.nearService.normalizeAccountId(dto.toAddress);
    const tokenAddress = dto.tokenAddress
      ? (dto.tokenAddress.toLowerCase() === 'near' ? 'near' : this.nearService.normalizeAccountId(dto.tokenAddress))
      : 'near';

    // Verify on-chain receipt via NEAR RPC
    let status: 'PENDING' | 'CONFIRMED' | 'FAILED' = 'PENDING';
    let blockNumber: string | null = null;

    try {
      const receipt = await this.blockchainService.getTransactionReceipt(txHash, fromAddress);
      if (receipt) {
        const isSuccess =
          receipt.status?.SuccessValue !== undefined ||
          receipt.final_execution_status === 'FINAL';
        status = isSuccess ? 'CONFIRMED' : 'FAILED';
        blockNumber = receipt.transaction_outcome?.block_hash || null;
      }
    } catch (err) {
      this.logger.debug(`Receipt not immediately available for ${txHash}`);
    }

    const txRecord = await this.prisma.$transaction(async (prismaTx) => {
      const record = await prismaTx.transaction.create({
        data: {
          treasuryId: treasury.id,
          txHash,
          chainId: treasury.chainId,
          type: (dto.type as any) || 'TRANSFER',
          tokenAddress,
          tokenSymbol: dto.tokenSymbol || 'NEAR',
          amount: dto.amount,
          fromAddress,
          toAddress,
          status,
          blockNumber,
          timestamp: new Date(),
        },
      });

      // If linked to an approval, update approval status
      if (dto.approvalId) {
        const approval = await prismaTx.approval.findUnique({
          where: { id: dto.approvalId },
        });

        if (approval && approval.treasuryId === treasury.id) {
          await prismaTx.approval.update({
            where: { id: dto.approvalId },
            data: {
              status: status === 'CONFIRMED' ? 'EXECUTED' : status === 'FAILED' ? 'FAILED' : 'APPROVED',
              txHash,
              approvedAt: approval.approvedAt || new Date(),
            },
          });
        }
      }

      return record;
    });

    // Send Telegram alert for recorded on-chain transaction
    this.telegramService
      .notifyTransactionRecorded({
        treasuryName: treasury.name,
        type: (dto.type as any) || 'TRANSFER',
        amount: dto.amount,
        tokenSymbol: dto.tokenSymbol || 'NEAR',
        fromAddress,
        toAddress,
        txHash,
        status,
      })
      .catch((err) => this.logger.warn(`Telegram error: ${err.message}`));

    return txRecord;
  }

  async listTransactions(treasuryId: string, userId: string, query: QueryTransactionsDto) {
    await this.verifyTreasuryAccess(treasuryId, userId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { treasuryId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionStatus(treasuryId: string, txHash: string, userId: string) {
    await this.verifyTreasuryAccess(treasuryId, userId);
    const hash = txHash;

    let record = await this.prisma.transaction.findUnique({
      where: { txHash: hash },
    });

    // Check latest receipt on NEAR Protocol
    const receipt = await this.blockchainService.getTransactionReceipt(hash);
    if (receipt) {
      const isSuccess =
        receipt.status?.SuccessValue !== undefined ||
        receipt.final_execution_status === 'FINAL';
      const newStatus = isSuccess ? 'CONFIRMED' : 'FAILED';
      if (!record || record.status !== newStatus) {
        if (record) {
          record = await this.prisma.transaction.update({
            where: { id: record.id },
            data: {
              status: newStatus,
              blockNumber: receipt.transaction_outcome?.block_hash || null,
            },
          });
        }
      }
    }

    return {
      txHash: hash,
      status: record ? record.status : 'PENDING',
      blockNumber: record?.blockNumber || null,
      record,
    };
  }

  async getPendingTransactions(treasuryId: string, userId: string) {
    await this.verifyTreasuryAccess(treasuryId, userId);

    return this.prisma.transaction.findMany({
      where: {
        treasuryId,
        status: 'PENDING',
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
