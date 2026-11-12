import { Injectable, Logger } from '@nestjs/common';
import { Rule, TreasuryAsset, Transaction } from '../../generated/prisma/client.js';

export interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  reason: string;
  suggestedAction?: {
    type: string;
    payload: Record<string, any>;
  };
}

@Injectable()
export class RulesEngine {
  private readonly logger = new Logger(RulesEngine.name);

  evaluateRule(
    rule: Rule,
    assets: TreasuryAsset[],
    recentTransactions: Transaction[],
  ): EvaluationResult {
    const condition = (rule.condition as Record<string, any>) || {};
    const action = (rule.action as Record<string, any>) || {};

    switch (rule.type) {
      case 'LOW_BALANCE': {
        const threshold = parseFloat(condition.threshold || '0');
        const tokenSymbol = (condition.token || 'NEAR').toUpperCase();

        const asset = assets.find((a) => a.symbol.toUpperCase() === tokenSymbol);
        const currentBalance = asset ? parseFloat(asset.balance.toString()) : 0;

        if (currentBalance < threshold) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: true,
            reason: `${tokenSymbol} balance (${currentBalance}) is below the required threshold of ${threshold}`,
            suggestedAction: {
              type: 'NOTIFY',
              payload: {
                message: `Treasury low balance alert: ${tokenSymbol} is at ${currentBalance}, threshold is ${threshold}`,
                severity: 'WARNING',
              },
            },
          };
        }
        break;
      }

      case 'LARGE_TRANSACTION': {
        const threshold = parseFloat(condition.threshold || '0');
        const largeTx = recentTransactions.find(
          (tx) => parseFloat(tx.amount.toString()) >= threshold,
        );

        if (largeTx) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: true,
            reason: `Transaction of ${largeTx.amount} ${largeTx.tokenSymbol || 'NEAR'} exceeds configured threshold of ${threshold}`,
            suggestedAction: {
              type: 'NOTIFY',
              payload: {
                txHash: largeTx.txHash,
                amount: largeTx.amount.toString(),
                severity: 'CRITICAL',
              },
            },
          };
        }
        break;
      }

      case 'EXCESS_BALANCE': {
        const threshold = parseFloat(condition.threshold || '1000');
        const tokenSymbol = (condition.token || 'NEAR').toUpperCase();
        const asset = assets.find((a) => a.symbol.toUpperCase() === tokenSymbol);
        const currentBalance = asset ? parseFloat(asset.balance.toString()) : 0;

        if (currentBalance > threshold) {
          const excess = currentBalance - threshold;
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: true,
            reason: `${tokenSymbol} balance (${currentBalance}) exceeds operating threshold of ${threshold}. Excess: ${excess}`,
            suggestedAction: {
              type: 'RECOMMEND',
              payload: {
                message: `Consider moving ${excess.toFixed(2)} ${tokenSymbol} to reserve or cold storage`,
                amount: excess.toString(),
                token: tokenSymbol,
              },
            },
          };
        }
        break;
      }

      case 'SCHEDULED_TRANSFER': {
        const targetRecipient = condition.recipientAddress || condition.recipient;
        const scheduledAmount = condition.amount || '0';
        const taskCategory = condition.task || 'scheduled_payment';
        const currentHour = new Date().getUTCHours();
        const allowedStartHour = parseInt(condition.startHourUtc ?? '8', 10);
        const allowedEndHour = parseInt(condition.endHourUtc ?? '18', 10);

        const isWithinWindow =
          currentHour >= allowedStartHour && currentHour < allowedEndHour;

        if (isWithinWindow) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: true,
            reason: `Scheduled payout of ${scheduledAmount} NEAR for task "${taskCategory}" to ${targetRecipient || 'vendor'} is active during operating window (${allowedStartHour}:00 - ${allowedEndHour}:00 UTC)`,
            suggestedAction: {
              type: 'CREATE_APPROVAL',
              payload: {
                recipientAddress: targetRecipient,
                amount: scheduledAmount,
                task: taskCategory,
                reason: `Automated scheduled transfer evaluated within time window`,
              },
            },
          };
        }
        break;
      }

      case 'INCOMING_PAYMENT': {
        const minAmount = parseFloat(condition.minAmount || '0');
        const incomingTx = recentTransactions.find(
          (tx) =>
            (tx.type === 'DEPOSIT' || parseFloat(tx.amount.toString()) > 0) &&
            parseFloat(tx.amount.toString()) >= minAmount,
        );

        if (incomingTx) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: true,
            reason: `Incoming payment of ${incomingTx.amount} ${incomingTx.tokenSymbol || 'NEAR'} detected`,
            suggestedAction: {
              type: 'NOTIFY',
              payload: {
                txHash: incomingTx.txHash,
                amount: incomingTx.amount.toString(),
                severity: 'INFO',
              },
            },
          };
        }
        break;
      }

      default:
        break;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: false,
      reason: 'Condition not met',
    };
  }
}

