import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AgentPermissionsService } from './agent-permissions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractService } from '../blockchain/contract.service.js';
import { NearService } from '../blockchain/near.service.js';
import { TelegramService } from '../notifications/telegram.service.js';

describe('AgentPermissionsService — 4 Core Permissions', () => {
  let service: AgentPermissionsService;
  let mockPrisma: any;
  let mockContractService: any;
  let mockNearService: any;

  const mockTreasury = {
    id: 'treasury-123',
    ownerId: 'user-1',
    name: 'Hackathon Treasury',
    contractAddress: 'treasury.hardicon1140.testnet',
  };

  const mockAgent = {
    id: 'agent-1',
    treasuryId: 'treasury-123',
    name: 'Cloud & Research Agent',
    accountId: 'compute-agent.testnet',
    role: 'CLOUD_AND_APIS',
    isActive: true,
    // 1. Approved Recipient Permission
    approvedRecipients: ['approved-hosting.testnet', 'research-api.testnet'],
    enforceWhitelist: true,
    // 2. Transaction Approval Permission (5 NEAR instant limit)
    instantSpendingLimit: 5.0,
    dailySpendingLimit: 20.0,
    spentToday: 0.0,
    lastSpendingReset: new Date(),
    // 3. Task-Based Permission
    approvedTasks: ['cloud_hosting', 'research_apis', 'compute_resources'],
    enforceTaskWhitelist: true,
    // 4. Time-Based Permission (8:00 - 18:00 UTC, Mon-Fri)
    timeWindowEnabled: false,
    startHourUtc: 8,
    endHourUtc: 18,
    allowedDaysOfWeek: [1, 2, 3, 4, 5],
  };

  beforeEach(async () => {
    mockPrisma = {
      treasury: {
        findUnique: jest.fn().mockImplementation((args: any) => {
          if (args.where.id === 'treasury-123') return Promise.resolve(mockTreasury);
          return Promise.resolve(null);
        }),
      },
      agent: {
        findUnique: jest.fn().mockImplementation((args: any) => {
          if (args.where?.id === 'agent-1') return Promise.resolve({ ...mockAgent });
          if (
            args.where?.treasuryId_accountId?.accountId ===
            'compute-agent.testnet'
          ) {
            return Promise.resolve({ ...mockAgent });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: 'agent-new', ...args.data }),
        ),
        update: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ ...mockAgent, ...args.data }),
        ),
        findMany: jest.fn().mockResolvedValue([{ ...mockAgent }]),
        delete: jest.fn().mockResolvedValue({ id: 'agent-1' }),
      },
      agentSpendRequest: {
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: 'req-1', ...args.data }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      approval: {
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({
            id: 'approval-999',
            ...args.data,
            status: 'PENDING',
          }),
        ),
      },
      agentInsight: {
        create: jest.fn().mockResolvedValue({ id: 'insight-1' }),
      },
    };

    mockContractService = {
      isRecipientApproved: jest.fn().mockResolvedValue(false),
      isAgentAuthorized: jest.fn().mockResolvedValue(true),
    };

    mockNearService = {
      normalizeAccountId: jest.fn((id: string) => id.trim().toLowerCase()),
      isValidAccountId: jest.fn(() => true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentPermissionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ContractService, useValue: mockContractService },
        { provide: NearService, useValue: mockNearService },
        {
          provide: TelegramService,
          useValue: {
            notifyAgentSpendApproved: jest.fn().mockResolvedValue(true),
            notifyAgentSpendApprovalRequired: jest.fn().mockResolvedValue(true),
            notifyAgentSpendBlocked: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AgentPermissionsService>(AgentPermissionsService);
  });

  // ========================================================
  // FEATURE 1: Approved Recipient Permission
  // ========================================================
  describe('1. Approved Recipient Permission', () => {
    it('should ALLOW payment when recipient is in approved whitelist', async () => {
      const result = await service.evaluateAndProcessSpendRequest({
        treasuryId: 'treasury-123',
        agentAccountId: 'compute-agent.testnet',
        recipientAddress: 'approved-hosting.testnet',
        amount: '3.0',
        task: 'cloud_hosting',
        reason: 'Monthly server hosting invoice',
      });

      expect(result.evaluation.allowed).toBe(true);
      expect(result.evaluation.details.recipientApproved).toBe(true);
      expect(result.evaluation.status).toBe('AUTO_APPROVED');
    });

    it('should BLOCK payment when recipient is NOT in approved whitelist', async () => {
      const result = await service.evaluateAndProcessSpendRequest({
        treasuryId: 'treasury-123',
        agentAccountId: 'compute-agent.testnet',
        recipientAddress: 'unknown-hacker.testnet',
        amount: '3.0',
        task: 'cloud_hosting',
        reason: 'Transfer to unverified wallet',
      });

      expect(result.evaluation.allowed).toBe(false);
      expect(result.evaluation.status).toBe('BLOCKED_BY_POLICY');
      expect(result.evaluation.details.recipientApproved).toBe(false);
      expect(result.evaluation.policyViolations[0]).toContain('UNAPPROVED_RECIPIENT');
      expect(mockPrisma.approval.create).not.toHaveBeenCalled();
    });
  });

  // ========================================================
  // FEATURE 2: Transaction Approval Permission
  // ========================================================
  describe('2. Transaction Approval Permission', () => {
    it('should AUTO_APPROVE payments <= 5 NEAR instant spending threshold', async () => {
      const result = await service.evaluateAndProcessSpendRequest({
        treasuryId: 'treasury-123',
        agentAccountId: 'compute-agent.testnet',
        recipientAddress: 'research-api.testnet',
        amount: '4.5', // <= 5 NEAR
        task: 'research_apis',
        reason: 'API embeddings credits',
      });

      expect(result.evaluation.allowed).toBe(true);
      expect(result.evaluation.status).toBe('AUTO_APPROVED');
      expect(result.evaluation.details.withinInstantLimit).toBe(true);
      expect(mockPrisma.approval.create).not.toHaveBeenCalled();
    });

    it('should ROUTE TO HUMAN APPROVAL when payment > 5 NEAR threshold', async () => {
      const result = await service.evaluateAndProcessSpendRequest({
        treasuryId: 'treasury-123',
        agentAccountId: 'compute-agent.testnet',
        recipientAddress: 'research-api.testnet',
        amount: '8.5', // > 5 NEAR threshold!
        task: 'research_apis',
        reason: 'Large LLM cluster batch job',
      });

      expect(result.evaluation.allowed).toBe(true);
      expect(result.evaluation.status).toBe('PENDING_APPROVAL');
      expect(result.evaluation.details.withinInstantLimit).toBe(false);
      expect(result.evaluation.approvalId).toBe('approval-999');
      expect(mockPrisma.approval.create).toHaveBeenCalled();
    });
  });

  // ========================================================
  // FEATURE 3: Task-Based Permission
  // ========================================================
  describe('3. Task-Based Permission', () => {
    it('should ALLOW payment when spending on an approved task (e.g. research_apis)', async () => {
      const result = await service.evaluateAndProcessSpendRequest({
        treasuryId: 'treasury-123',
        agentAccountId: 'compute-agent.testnet',
        recipientAddress: 'research-api.testnet',
        amount: '2.0',
        task: 'research_apis', // Approved task
        reason: 'Vector search queries',
      });

      expect(result.evaluation.allowed).toBe(true);
      expect(result.evaluation.details.taskPermitted).toBe(true);
    });

    it('should BLOCK payment when spending on an unauthorized task category', async () => {
      const result = await service.evaluateAndProcessSpendRequest({
        treasuryId: 'treasury-123',
        agentAccountId: 'compute-agent.testnet',
        recipientAddress: 'approved-hosting.testnet',
        amount: '2.0',
        task: 'unauthorized_luxury_purchase', // Unapproved task!
        reason: 'Non-work related expenses',
      });

      expect(result.evaluation.allowed).toBe(false);
      expect(result.evaluation.status).toBe('BLOCKED_BY_POLICY');
      expect(result.evaluation.details.taskPermitted).toBe(false);
      expect(result.evaluation.policyViolations[0]).toContain('UNAPPROVED_TASK');
    });
  });

  // ========================================================
  // FEATURE 4: Time-Based Permission
  // ========================================================
  describe('4. Time-Based Permission', () => {
    it('should BLOCK payment when request falls outside approved operating hours (e.g. 2 AM)', async () => {
      // Mock agent with time window enabled (8 AM - 6 PM UTC)
      mockPrisma.agent.findUnique.mockResolvedValue({
        ...mockAgent,
        timeWindowEnabled: true,
        startHourUtc: 8,
        endHourUtc: 18,
        allowedDaysOfWeek: [1, 2, 3, 4, 5],
      });

      // Freeze Date to 2:00 AM UTC (outside 8 AM - 6 PM)
      const mockNightTime = new Date('2026-11-12T02:00:00Z');
      const originalDate = global.Date;
      // @ts-ignore
      global.Date = class extends Date {
        constructor() {
          super();
          return mockNightTime;
        }
      };

      try {
        const result = await service.evaluateAndProcessSpendRequest({
          treasuryId: 'treasury-123',
          agentAccountId: 'compute-agent.testnet',
          recipientAddress: 'approved-hosting.testnet',
          amount: '1.0',
          task: 'cloud_hosting',
          reason: 'Late night automated job',
        });

        expect(result.evaluation.allowed).toBe(false);
        expect(result.evaluation.status).toBe('BLOCKED_BY_POLICY');
        expect(result.evaluation.details.withinTimeWindow).toBe(false);
        expect(result.evaluation.policyViolations[0]).toContain('OUTSIDE_TIME_WINDOW');
      } finally {
        global.Date = originalDate;
      }
    });

    it('should ALLOW payment when request falls inside approved operating hours (e.g. 10 AM)', async () => {
      // Mock agent with time window enabled (8 AM - 6 PM UTC)
      mockPrisma.agent.findUnique.mockResolvedValue({
        ...mockAgent,
        timeWindowEnabled: true,
        startHourUtc: 8,
        endHourUtc: 18,
        allowedDaysOfWeek: [1, 2, 3, 4, 5],
      });

      // Freeze Date to 10:00 AM UTC on Thursday (within window)
      const mockBusinessHour = new Date('2026-11-12T10:00:00Z');
      const originalDate = global.Date;
      // @ts-ignore
      global.Date = class extends Date {
        constructor() {
          super();
          return mockBusinessHour;
        }
      };

      try {
        const result = await service.evaluateAndProcessSpendRequest({
          treasuryId: 'treasury-123',
          agentAccountId: 'compute-agent.testnet',
          recipientAddress: 'approved-hosting.testnet',
          amount: '1.0',
          task: 'cloud_hosting',
          reason: 'Business hour server expansion',
        });

        expect(result.evaluation.allowed).toBe(true);
        expect(result.evaluation.status).toBe('AUTO_APPROVED');
        expect(result.evaluation.details.withinTimeWindow).toBe(true);
      } finally {
        global.Date = originalDate;
      }
    });
  });
});

