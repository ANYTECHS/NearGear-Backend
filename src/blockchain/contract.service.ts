import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service.js';

export interface SpendingStatus {
  maxTransactionAmount: string;
  dailySpendingLimit: string;
  spentToday: string;
  remainingToday: string;
}

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private defaultContractId: string;

  constructor(
    private blockchainService: BlockchainService,
    private configService: ConfigService,
  ) {
    this.defaultContractId = this.configService.get<string>(
      'treasuryContractAddress',
      '',
    );
  }

  getDefaultContractAddress(): string {
    return this.defaultContractId;
  }

  private resolveContractId(contractId?: string): string | null {
    const target = contractId || this.defaultContractId;
    if (!target) {
      return null;
    }
    return target.trim().toLowerCase();
  }

  private async callViewMethod<T = any>(
    contractId: string,
    methodName: string,
    args: Record<string, any> = {},
  ): Promise<T | null> {
    try {
      const argsBase64 = Buffer.from(JSON.stringify(args)).toString('base64');
      const response = await this.blockchainService.rpcCall('query', {
        request_type: 'call_function',
        finality: 'final',
        account_id: contractId,
        method_name: methodName,
        args_base64: argsBase64,
      });

      if (!response?.result) {
        return null;
      }

      const bytes = Buffer.from(response.result);
      const str = bytes.toString('utf-8');
      return str ? JSON.parse(str) : null;
    } catch (error) {
      this.logger.debug(
        `NEAR view call ${methodName} on ${contractId} failed: ${error.message}`,
      );
      return null;
    }
  }

  async getVaultOwner(contractId?: string): Promise<string | null> {
    const target = this.resolveContractId(contractId);
    if (!target) return null;

    const owner =
      (await this.callViewMethod<string>(target, 'get_owner')) ||
      (await this.callViewMethod<string>(target, 'owner'));

    return owner ? owner.toLowerCase() : null;
  }

  async isVaultPaused(contractId?: string): Promise<boolean> {
    const target = this.resolveContractId(contractId);
    if (!target) return false;

    const paused =
      (await this.callViewMethod<boolean>(target, 'is_paused')) ??
      (await this.callViewMethod<boolean>(target, 'paused'));

    return Boolean(paused);
  }

  async isAgentAuthorized(
    agentId: string,
    contractId?: string,
  ): Promise<boolean> {
    const target = this.resolveContractId(contractId);
    if (!target || !agentId) return false;

    const isAuth =
      (await this.callViewMethod<boolean>(target, 'is_agent_authorized', {
        agent_id: agentId.trim().toLowerCase(),
      })) ??
      (await this.callViewMethod<boolean>(target, 'authorized_agents', {
        account_id: agentId.trim().toLowerCase(),
      }));

    return Boolean(isAuth);
  }

  async isRecipientApproved(
    recipientId: string,
    contractId?: string,
  ): Promise<boolean> {
    const target = this.resolveContractId(contractId);
    if (!target || !recipientId) return false;

    const approved =
      (await this.callViewMethod<boolean>(target, 'is_recipient_approved', {
        recipient_id: recipientId.trim().toLowerCase(),
      })) ??
      (await this.callViewMethod<boolean>(target, 'approved_recipients', {
        account_id: recipientId.trim().toLowerCase(),
      }));

    return Boolean(approved);
  }

  async getSpendingStatus(contractId?: string): Promise<SpendingStatus | null> {
    const target = this.resolveContractId(contractId);
    if (!target) return null;

    const status = await this.callViewMethod<any>(target, 'get_spending_status');
    if (!status) return null;

    return {
      maxTransactionAmount: status.max_transaction_amount?.toString() || '0',
      dailySpendingLimit: status.daily_spending_limit?.toString() || '0',
      spentToday: status.spent_today?.toString() || '0',
      remainingToday: status.remaining_today?.toString() || '0',
    };
  }

  async getVaultBalance(
    tokenContractId: string,
    contractId?: string,
  ): Promise<string> {
    const target = this.resolveContractId(contractId);
    if (!target) return '0';

    const info = await this.blockchainService.getTokenBalance(
      tokenContractId,
      target,
    );
    return info.balanceFormatted;
  }
}
