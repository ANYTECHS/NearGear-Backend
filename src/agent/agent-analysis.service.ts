import { Injectable, Logger } from '@nestjs/common';
import { Transaction, TreasuryAsset } from '../../generated/prisma/client.js';

export interface DetectedAnomaly {
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'ANOMALY' | 'SPENDING' | 'SECURITY';
  reason: string;
  txHash?: string;
  suggestedNextStep: string;
}

@Injectable()
export class AgentAnalysisService {
  private readonly logger = new Logger(AgentAnalysisService.name);

  detectAnomalies(
    transactions: Transaction[],
    assets: TreasuryAsset[],
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    if (transactions.length === 0) {
      return anomalies;
    }

    // 1. Analyze Outlier Transaction Sizes
    const amounts = transactions
      .map((tx) => parseFloat(tx.amount.toString()))
      .filter((amt) => !isNaN(amt) && amt > 0);

    if (amounts.length >= 3) {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      for (const tx of transactions) {
        const amt = parseFloat(tx.amount.toString());
        if (amt >= avg * 3.5 && amt > 1.0) {
          anomalies.push({
            title: `Unusually Large Transaction: ${amt} ${tx.tokenSymbol || 'NEAR'}`,
            description: `Transaction of ${amt} ${tx.tokenSymbol || 'NEAR'} is over 3.5x larger than your recent average of ${avg.toFixed(2)} ${tx.tokenSymbol || 'NEAR'}.`,
            severity: 'WARNING',
            type: 'ANOMALY',
            reason: 'Statistical amount outlier',
            txHash: tx.txHash,
            suggestedNextStep: 'Review transaction destination and purpose before authorizing future automated transfers.',
          });
        }
      }
    }

    // 2. High Frequency Outgoing Transfers (Burst detection)
    // Check if 3 or more outgoing transactions occurred within 60 minutes
    const outgoing = transactions
      .filter((tx) => tx.type === 'TRANSFER' || tx.type === 'WITHDRAW')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    for (let i = 0; i < outgoing.length - 2; i++) {
      const t1 = outgoing[i].timestamp.getTime();
      const t3 = outgoing[i + 2].timestamp.getTime();
      const diffMinutes = (t1 - t3) / (1000 * 60);

      if (diffMinutes <= 60) {
        anomalies.push({
          title: 'High-Frequency Outgoing Activity',
          description: `Multiple outgoing transactions (${outgoing.slice(i, i + 3).length}) occurred within ${Math.round(diffMinutes)} minutes.`,
          severity: 'CRITICAL',
          type: 'SECURITY',
          reason: 'Rapid succession of outgoing transactions',
          suggestedNextStep: 'Verify if scheduled payouts or batch operations are expected; consider pausing the vault if unexpected.',
        });
        break;
      }
    }

    // 3. Low Reserve Warning
    const nearAsset = assets.find((a) => a.symbol.toUpperCase() === 'NEAR');
    if (nearAsset) {
      const nearBalance = parseFloat(nearAsset.balance.toString());
      if (nearBalance < 0.5 && nearBalance > 0) {
        anomalies.push({
          title: 'Low Gas Reserves Alert',
          description: `Native NEAR balance is down to ${nearBalance.toFixed(4)} NEAR. Gas payments for treasury execution may fail soon.`,
          severity: 'WARNING',
          type: 'SPENDING',
          reason: 'Low native token balance for transaction fees',
          suggestedNextStep: 'Deposit NEAR into the treasury to ensure operational continuity.',
        });
      }
    }

    return anomalies;
  }
}

