import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BlockchainService } from '../blockchain/blockchain.service.js';
import { NearService } from '../blockchain/near.service.js';
import { TelegramService } from '../notifications/telegram.service.js';
import { TransactionTypeDto } from './dto/propose-transaction.dto.js';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: any;
  let blockchainService: any;
  let nearService: any;

  const mockAddress = 'alice.testnet';
  const mockTxHash = 'E4bVn9V5dCq3aK7vUf9ZtP2xM1sH4jL8rY6wQ3eA7bC';

  beforeEach(async () => {
    prisma = {
      treasury: {
        findUnique: jest.fn(),
      },
      approval: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    blockchainService = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: { SuccessValue: '' },
        final_execution_status: 'FINAL',
        transaction_outcome: { block_hash: 'block123' },
      }),
    };

    nearService = {
      normalizeAccountId: jest.fn((addr: string) => addr.toLowerCase()),
      isValidAccountId: jest.fn(() => true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchainService },
        { provide: NearService, useValue: nearService },
        {
          provide: TelegramService,
          useValue: {
            notifyTransactionRecorded: jest.fn().mockResolvedValue(true),
            notifyTransactionProposed: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('proposeTransaction', () => {
    it('should create an approval record for a proposed transaction', async () => {
      prisma.treasury.findUnique.mockResolvedValue({
        id: 'treasury-1',
        ownerId: 'user-1',
      });

      prisma.approval.create.mockResolvedValue({
        id: 'approval-1',
        treasuryId: 'treasury-1',
        recipientAddress: mockAddress.toLowerCase(),
        amount: '2.5',
        status: 'PENDING',
      });

      const result = await service.proposeTransaction('user-1', {
        treasuryId: 'treasury-1',
        toAddress: mockAddress,
        amount: '2.5',
        type: TransactionTypeDto.TRANSFER,
      });

      expect(result).toHaveProperty('approval');
      expect(prisma.approval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientAddress: mockAddress.toLowerCase(),
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should reject non-positive amounts', async () => {
      prisma.treasury.findUnique.mockResolvedValue({
        id: 'treasury-1',
        ownerId: 'user-1',
      });

      await expect(
        service.proposeTransaction('user-1', {
          treasuryId: 'treasury-1',
          toAddress: mockAddress,
          amount: '0',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordTransaction', () => {
    it('should return existing record if txHash is duplicate (idempotency)', async () => {
      prisma.treasury.findUnique.mockResolvedValue({
        id: 'treasury-1',
        ownerId: 'user-1',
      });

      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-existing',
        txHash: mockTxHash,
        status: 'CONFIRMED',
      });

      const result = await service.recordTransaction('user-1', {
        treasuryId: 'treasury-1',
        txHash: mockTxHash,
        fromAddress: mockAddress,
        toAddress: mockAddress,
        amount: '1.0',
      });

      expect(result.id).toBe('tx-existing');
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('should record new transaction with confirmed status from receipt', async () => {
      prisma.treasury.findUnique.mockResolvedValue({
        id: 'treasury-1',
        ownerId: 'user-1',
        chainId: 0,
      });

      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx-new',
        txHash: mockTxHash,
        status: 'CONFIRMED',
        blockNumber: 'block123',
      });

      const result = await service.recordTransaction('user-1', {
        treasuryId: 'treasury-1',
        txHash: mockTxHash,
        fromAddress: mockAddress,
        toAddress: mockAddress,
        amount: '1.0',
      });

      expect(result.status).toBe('CONFIRMED');
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CONFIRMED',
            blockNumber: 'block123',
          }),
        }),
      );
    });
  });
});
