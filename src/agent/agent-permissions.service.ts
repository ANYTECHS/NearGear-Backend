import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractService } from '../blockchain/contract.service.js';
import { NearService } from '../blockchain/near.service.js';
import { TelegramService } from '../notifications/telegram.service.js';
import { CreateAgentDto } from './dto/create-agent.dto.js';
import { UpdateAgentDto } from './dto/update-agent.dto.js';
import { AgentSpendRequestDto } from './dto/agent-spend-request.dto.js';

export interface PolicyEvaluationResult {
  allowed: boolean;
  status: 'AUTO_APPROVED' | 'PENDING_APPROVAL' | 'BLOCKED_BY_POLICY';
  policyViolations: string[];
  instantLimit: string;
  requestedAmount: string;
  approvalId?: string;
  reason: string;
  details: {
    recipientApproved: boolean;
    taskPermitted: boolean;
    withinTimeWindow: boolean;
    withinInstantLimit: boolean;
    withinDailyLimit: boolean;
  };
}

@Injectable()
export class AgentPermissionsService {
  private readonly logger = new Logger(AgentPermissionsService.name);

  constructor(
    private prisma: PrismaService,
    private contractService: ContractService,
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

  // --- AGENT CRUD MANAGEMENT ---

  async createAgent(treasuryId: string, userId: string, dto: CreateAgentDto) {
    const treasury = await this.verifyTreasuryAccess(treasuryId, userId);
    const accountId = this.nearService.normalizeAccountId(dto.accountId);

    const existing = await this.prisma.agent.findUnique({
      where: {
        treasuryId_accountId: {
          treasuryId,
          accountId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Agent with accountId ${accountId} already exists in this treasury`,
      );
    }

    // Normalize recipients and tasks
    const approvedRecipients = (dto.approvedRecipients || []).map((addr) =>
      this.nearService.normalizeAccountId(addr),
    );
    const approvedTasks = (dto.approvedTasks || []).map((t) =>
      t.trim().toLowerCase(),
    );

    const agent = await this.prisma.agent.create({
      data: {
        treasuryId,
        name: dto.name.trim(),
        accountId,
        role: dto.role?.trim() || 'GENERAL_AGENT',
        isActive: true,

        // 1. Approved Recipient Permission
        approvedRecipients,
        enforceWhitelist: dto.enforceWhitelist ?? true,

        // 2. Transaction Approval Permission
        instantSpendingLimit: dto.instantSpendingLimit || '5.0',
        dailySpendingLimit: dto.dailySpendingLimit || '20.0',
        spentToday: '0',
        lastSpendingReset: new Date(),

        // 3. Task-Based Permission
        approvedTasks:
          approvedTasks.length > 0
            ? approvedTasks
            : ['cloud_hosting', 'research_apis', 'compute_resources'],
        enforceTaskWhitelist: dto.enforceTaskWhitelist ?? true,

        // 4. Time-Based Permission
        timeWindowEnabled: dto.timeWindowEnabled ?? false,
        startHourUtc: dto.startHourUtc ?? 8,
        endHourUtc: dto.endHourUtc ?? 18,
        allowedDaysOfWeek: dto.allowedDaysOfWeek || [1, 2, 3, 4, 5],
      },
    });

    // Create an insight welcoming the agent and stating its rules
    await this.prisma.agentInsight.create({
      data: {
        treasuryId,
        title: `AI Agent Registered: ${agent.name}`,
        description: `Agent ${agent.accountId} registered with instant limit of ${agent.instantSpendingLimit} NEAR. Payments above this threshold will require owner approval.`,
        type: 'SECURITY',
        severity: 'INFO',
        metadata: {
          agentId: agent.id,
          enforceWhitelist: agent.enforceWhitelist,
          enforceTaskWhitelist: agent.enforceTaskWhitelist,
          timeWindowEnabled: agent.timeWindowEnabled,
        },
      },
    });

    return agent;
  }

  async listAgents(treasuryId: string, userId: string) {
    await this.verifyTreasuryAccess(treasuryId, userId);

    return this.prisma.agent.findMany({
      where: { treasuryId },
      include: {
        _count: {
          select: {
            spendRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAgentById(treasuryId: string, agentId: string, userId: string) {
    await this.verifyTreasuryAccess(treasuryId, userId);

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        spendRequests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!agent || agent.treasuryId !== treasuryId) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async updateAgent(
    treasuryId: string,
    agentId: string,
    userId: string,
    dto: UpdateAgentDto,
  ) {
    await this.verifyTreasuryAccess(treasuryId, userId);

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.treasuryId !== treasuryId) {
      throw new NotFoundException('Agent not found');
    }

    const approvedRecipients = dto.approvedRecipients
      ? dto.approvedRecipients.map((addr) =>
          this.nearService.normalizeAccountId(addr),
        )
      : undefined;

    const approvedTasks = dto.approvedTasks
      ? dto.approvedTasks.map((t) => t.trim().toLowerCase())
      : undefined;

    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.accountId !== undefined && {
          accountId: this.nearService.normalizeAccountId(dto.accountId),
        }),
        ...(dto.role !== undefined && { role: dto.role.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),

        // 1. Approved Recipient Permission
        ...(approvedRecipients !== undefined && { approvedRecipients }),
        ...(dto.enforceWhitelist !== undefined && {
          enforceWhitelist: dto.enforceWhitelist,
        }),

        // 2. Transaction Approval Permission
        ...(dto.instantSpendingLimit !== undefined && {
          instantSpendingLimit: dto.instantSpendingLimit,
        }),
        ...(dto.dailySpendingLimit !== undefined && {
          dailySpendingLimit: dto.dailySpendingLimit,
        }),

        // 3. Task-Based Permission
        ...(approvedTasks !== undefined && { approvedTasks }),
        ...(dto.enforceTaskWhitelist !== undefined && {
          enforceTaskWhitelist: dto.enforceTaskWhitelist,
        }),

        // 4. Time-Based Permission
        ...(dto.timeWindowEnabled !== undefined && {
          timeWindowEnabled: dto.timeWindowEnabled,
        }),
        ...(dto.startHourUtc !== undefined && {
          startHourUtc: dto.startHourUtc,
        }),
        ...(dto.endHourUtc !== undefined && { endHourUtc: dto.endHourUtc }),
        ...(dto.allowedDaysOfWeek !== undefined && {
          allowedDaysOfWeek: dto.allowedDaysOfWeek,
        }),
      },
    });
  }

  async deleteAgent(treasuryId: string, agentId: string, userId: string) {
    await this.verifyTreasuryAccess(treasuryId, userId);

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.treasuryId !== treasuryId) {
      throw new NotFoundException('Agent not found');
    }

    await this.prisma.agent.delete({
      where: { id: agentId },
    });

    return { message: 'Agent removed from treasury successfully' };
  }

  // --- CORE PERMISSIONS ENFORCEMENT ENGINE ---

  async evaluateAndProcessSpendRequest(
    dto: AgentSpendRequestDto,
    userId?: string,
  ): Promise<{
    evaluation: PolicyEvaluationResult;
    spendRequest: any;
  }> {
    const treasury = await this.prisma.treasury.findUnique({
      where: { id: dto.treasuryId },
    });

    if (!treasury) {
      throw new NotFoundException('Treasury not found');
    }

    const agentAccount = this.nearService.normalizeAccountId(
      dto.agentAccountId,
    );
    const recipientAccount = this.nearService.normalizeAccountId(
      dto.recipientAddress,
    );
    const taskKey = dto.task.trim().toLowerCase();
    const amountNum = parseFloat(dto.amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    // Lookup Agent
    const agent = await this.prisma.agent.findUnique({
      where: {
        treasuryId_accountId: {
          treasuryId: dto.treasuryId,
          accountId: agentAccount,
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(
        `Agent ${agentAccount} is not registered in this treasury`,
      );
    }

    if (!agent.isActive) {
      throw new ForbiddenException(
        `Agent ${agent.name} (${agentAccount}) is currently deactivated`,
      );
    }

    const policyViolations: string[] = [];

    // --- FEATURE 1: Approved Recipient Permission ---
    // The AI can only send payments to wallet addresses approved by the owner.
    let recipientApproved = true;
    if (agent.enforceWhitelist) {
      const isLocalApproved = agent.approvedRecipients.some(
        (addr) => addr.toLowerCase() === recipientAccount,
      );

      let isOnChainApproved = false;
      if (treasury.contractAddress) {
        isOnChainApproved = await this.contractService.isRecipientApproved(
          recipientAccount,
          treasury.contractAddress,
        );
      }

      recipientApproved = isLocalApproved || isOnChainApproved;
      if (!recipientApproved) {
        policyViolations.push(
          `UNAPPROVED_RECIPIENT: Recipient "${recipientAccount}" is not in the approved whitelist for agent "${agent.name}".`,
        );
      }
    }

    // --- FEATURE 3: Task-Based Permission ---
    // The AI can only spend on tasks or services approved by the owner (e.g. research APIs, cloud hosting).
    let taskPermitted = true;
    if (agent.enforceTaskWhitelist) {
      taskPermitted = agent.approvedTasks.some(
        (allowedTask) => allowedTask.toLowerCase() === taskKey,
      );

      if (!taskPermitted) {
        policyViolations.push(
          `UNAPPROVED_TASK: Spending on task category "${dto.task}" is not permitted. Authorized tasks: [${agent.approvedTasks.join(', ')}].`,
        );
      }
    }

    // --- FEATURE 4: Time-Based Permission ---
    // The AI can only make payments during approved periods (e.g. between 8 AM and 6 PM UTC).
    let withinTimeWindow = true;
    const now = new Date();
    if (agent.timeWindowEnabled) {
      const currentHourUtc = now.getUTCHours();
      const currentDayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat

      const isAllowedDay = agent.allowedDaysOfWeek.includes(currentDayOfWeek);
      const isAllowedHour =
        currentHourUtc >= agent.startHourUtc && currentHourUtc < agent.endHourUtc;

      withinTimeWindow = isAllowedDay && isAllowedHour;
      if (!withinTimeWindow) {
        policyViolations.push(
          `OUTSIDE_TIME_WINDOW: Payment requested at ${now.toISOString()} (${currentHourUtc}:00 UTC, Day ${currentDayOfWeek}). Allowed window: ${agent.startHourUtc}:00 - ${agent.endHourUtc}:00 UTC.`,
        );
      }
    }

    // Daily Limit Check & Reset
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const timeSinceReset = now.getTime() - agent.lastSpendingReset.getTime();
    let effectiveSpentToday = parseFloat(agent.spentToday.toString());

    if (timeSinceReset >= ONE_DAY_MS) {
      effectiveSpentToday = 0;
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: {
          spentToday: '0',
          lastSpendingReset: now,
        },
      });
    }

    const dailyLimit = parseFloat(agent.dailySpendingLimit.toString());
    const withinDailyLimit = effectiveSpentToday + amountNum <= dailyLimit;
    if (!withinDailyLimit) {
      policyViolations.push(
        `DAILY_LIMIT_EXCEEDED: Transfer of ${amountNum} NEAR exceeds remaining daily allowance (${(dailyLimit - effectiveSpentToday).toFixed(2)} NEAR remaining out of ${dailyLimit} NEAR).`,
      );
    }

    // --- FEATURE 2: Transaction Approval Permission ---
    // Payments above a specified amount require human approval. Payments <= instantSpendingLimit are auto-approved.
    const instantLimit = parseFloat(agent.instantSpendingLimit.toString());
    const withinInstantLimit = amountNum <= instantLimit;

    // DECISION MATRIX
    const isHardBlocked = policyViolations.some(
      (v) =>
        v.startsWith('UNAPPROVED_RECIPIENT') ||
        v.startsWith('UNAPPROVED_TASK') ||
        v.startsWith('OUTSIDE_TIME_WINDOW') ||
        v.startsWith('DAILY_LIMIT_EXCEEDED'),
    );

    if (isHardBlocked) {
      // 1. BLOCKED BY HARD POLICY
      const spendRequest = await this.prisma.agentSpendRequest.create({
        data: {
          treasuryId: treasury.id,
          agentId: agent.id,
          recipientAddress: recipientAccount,
          amount: dto.amount,
          tokenSymbol: dto.tokenSymbol || 'NEAR',
          task: taskKey,
          reason: dto.reason || 'Agent automated payment request',
          status: 'BLOCKED_BY_POLICY',
          policyViolations,
        },
      });

      // Record Security Alert
      await this.prisma.agentInsight.create({
        data: {
          treasuryId: treasury.id,
          title: `Security Policy Blocked Agent Payment`,
          description: `Agent "${agent.name}" attempted payment of ${dto.amount} NEAR to ${recipientAccount} for task "${dto.task}", but violated security rules: ${policyViolations.join(' | ')}`,
          type: 'SECURITY',
          severity: 'CRITICAL',
          metadata: {
            spendRequestId: spendRequest.id,
            agentId: agent.id,
            violations: policyViolations,
          },
        },
      });

      // Send Telegram Security Alert
      this.telegramService
        .notifyAgentSpendBlocked({
          treasuryName: treasury.name,
          agentName: agent.name,
          agentAccountId: agent.accountId,
          amount: dto.amount,
          tokenSymbol: dto.tokenSymbol,
          recipientAddress: recipientAccount,
          task: taskKey,
          violations: policyViolations,
        })
        .catch((err) => this.logger.warn(`Telegram error: ${err.message}`));

      return {
        evaluation: {
          allowed: false,
          status: 'BLOCKED_BY_POLICY',
          policyViolations,
          instantLimit: instantLimit.toString(),
          requestedAmount: dto.amount,
          reason: `Payment request violates treasury security rules: ${policyViolations[0]}`,
          details: {
            recipientApproved,
            taskPermitted,
            withinTimeWindow,
            withinInstantLimit,
            withinDailyLimit,
          },
        },
        spendRequest,
      };
    }

    if (!withinInstantLimit) {
      // 2. TRANSACTION APPROVAL REQUIRED (Amount > instant limit, e.g. > 5 NEAR)
      const approvalReason = `Agent "${agent.name}" (${agent.accountId}) requested ${amountNum} NEAR for task "${dto.task}", which exceeds the auto-approval limit of ${instantLimit} NEAR. Human owner approval required. ${dto.reason ? `Reason: ${dto.reason}` : ''}`;

      const approval = await this.prisma.approval.create({
        data: {
          treasuryId: treasury.id,
          actionType: 'AGENT_PAYMENT',
          recipientAddress: recipientAccount,
          tokenAddress: 'near',
          tokenSymbol: dto.tokenSymbol || 'NEAR',
          amount: dto.amount,
          reason: approvalReason,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        },
      });

      const spendRequest = await this.prisma.agentSpendRequest.create({
        data: {
          treasuryId: treasury.id,
          agentId: agent.id,
          recipientAddress: recipientAccount,
          amount: dto.amount,
          tokenSymbol: dto.tokenSymbol || 'NEAR',
          task: taskKey,
          reason: dto.reason || 'High-value transaction requiring sign-off',
          status: 'PENDING_APPROVAL',
          approvalId: approval.id,
          policyViolations: [
            `APPROVAL_THRESHOLD_EXCEEDED: Amount (${amountNum} NEAR) exceeds instant approval limit of ${instantLimit} NEAR. Routed to treasury owner for approval.`,
          ],
        },
      });

      // Notify owner via insight
      await this.prisma.agentInsight.create({
        data: {
          treasuryId: treasury.id,
          title: `Action Required: Transaction Approval for ${agent.name}`,
          description: approvalReason,
          type: 'SPENDING',
          severity: 'WARNING',
          metadata: {
            approvalId: approval.id,
            spendRequestId: spendRequest.id,
            amount: dto.amount,
            recipient: recipientAccount,
            task: taskKey,
          },
        },
      });

      // Send Telegram High-Value Alert
      this.telegramService
        .notifyAgentSpendApprovalRequired({
          treasuryName: treasury.name,
          agentName: agent.name,
          agentAccountId: agent.accountId,
          amount: dto.amount,
          tokenSymbol: dto.tokenSymbol,
          recipientAddress: recipientAccount,
          task: taskKey,
          instantLimit: instantLimit.toString(),
          approvalId: approval.id,
          reason: dto.reason,
        })
        .catch((err) => this.logger.warn(`Telegram error: ${err.message}`));

      return {
        evaluation: {
          allowed: true,
          status: 'PENDING_APPROVAL',
          policyViolations: [
            `Amount exceeds ${instantLimit} NEAR threshold; human approval required`,
          ],
          instantLimit: instantLimit.toString(),
          requestedAmount: dto.amount,
          approvalId: approval.id,
          reason: `Transaction exceeds instant approval threshold (${instantLimit} NEAR). Approval proposal created for owner sign-off.`,
          details: {
            recipientApproved: true,
            taskPermitted: true,
            withinTimeWindow: true,
            withinInstantLimit: false,
            withinDailyLimit: true,
          },
        },
        spendRequest,
      };
    }

    // 3. AUTO-APPROVED (All 4 permissions passed, amount <= 5 NEAR)
    const newSpentToday = effectiveSpentToday + amountNum;
    await this.prisma.agent.update({
      where: { id: agent.id },
      data: {
        spentToday: newSpentToday.toString(),
      },
    });

    const spendRequest = await this.prisma.agentSpendRequest.create({
      data: {
        treasuryId: treasury.id,
        agentId: agent.id,
        recipientAddress: recipientAccount,
        amount: dto.amount,
        tokenSymbol: dto.tokenSymbol || 'NEAR',
        task: taskKey,
        reason: dto.reason || 'Auto-approved autonomous disbursement',
        status: 'AUTO_APPROVED',
        policyViolations: [],
      },
    });

    await this.prisma.agentInsight.create({
      data: {
        treasuryId: treasury.id,
        title: `Payment Auto-Approved: ${amountNum} NEAR for ${agent.name}`,
        description: `Agent "${agent.name}" successfully spent ${amountNum} NEAR to approved recipient "${recipientAccount}" for task "${dto.task}". All security policies verified.`,
        type: 'SPENDING',
        severity: 'SUCCESS',
        metadata: {
          spendRequestId: spendRequest.id,
          agentId: agent.id,
          spentToday: newSpentToday,
        },
      },
    });

    // Send Telegram Auto-Approved Alert
    this.telegramService
      .notifyAgentSpendApproved({
        treasuryName: treasury.name,
        agentName: agent.name,
        agentAccountId: agent.accountId,
        amount: dto.amount,
        tokenSymbol: dto.tokenSymbol,
        recipientAddress: recipientAccount,
        task: taskKey,
        reason: dto.reason,
      })
      .catch((err) => this.logger.warn(`Telegram error: ${err.message}`));

    return {
      evaluation: {
        allowed: true,
        status: 'AUTO_APPROVED',
        policyViolations: [],
        instantLimit: instantLimit.toString(),
        requestedAmount: dto.amount,
        reason: `Payment passed all 4 permission rules (approved recipient, permitted task, active time window, and within ${instantLimit} NEAR instant approval limit).`,
        details: {
          recipientApproved: true,
          taskPermitted: true,
          withinTimeWindow: true,
          withinInstantLimit: true,
          withinDailyLimit: true,
        },
      },
      spendRequest,
    };
  }

  // --- QUERY SPEND REQUESTS ---

  async listSpendRequests(treasuryId: string, userId: string) {
    await this.verifyTreasuryAccess(treasuryId, userId);

    return this.prisma.agentSpendRequest.findMany({
      where: { treasuryId },
      include: {
        agent: true,
        approval: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getSpendRequestById(
    treasuryId: string,
    requestId: string,
    userId: string,
  ) {
    await this.verifyTreasuryAccess(treasuryId, userId);

    const req = await this.prisma.agentSpendRequest.findUnique({
      where: { id: requestId },
      include: {
        agent: true,
        approval: true,
      },
    });

    if (!req || req.treasuryId !== treasuryId) {
      throw new NotFoundException('Spend request not found');
    }

    return req;
  }
}

