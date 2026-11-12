import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private botToken?: string;
  private defaultChatId?: string;
  private network: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegramBotToken');
    this.defaultChatId = this.configService.get<string>('telegramChatId');
    this.network = this.configService.get<string>('nearNetwork', 'testnet');

    if (this.botToken) {
      this.logger.log('TelegramService initialized with bot token');
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured; Telegram notifications will be disabled');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.botToken);
  }

  private getExplorerUrl(txHash: string): string {
    const base =
      this.network === 'mainnet'
        ? 'https://nearblocks.io/txns/'
        : 'https://testnet.nearblocks.io/txns/';
    return `${base}${txHash}`;
  }

  async sendMessage(text: string, targetChatId?: string): Promise<boolean> {
    const chatId = targetChatId || this.defaultChatId;

    if (!this.botToken) {
      this.logger.debug('Skipping Telegram notification: TELEGRAM_BOT_TOKEN not set');
      return false;
    }

    if (!chatId) {
      this.logger.debug(
        'Skipping Telegram notification: No target chatId specified and TELEGRAM_CHAT_ID is empty',
      );
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        this.logger.warn(`Telegram API error: ${data.description || JSON.stringify(data)}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Failed to send Telegram notification: ${error.message}`);
      return false;
    }
  }

  // --- 1. ON-CHAIN TRANSACTION RECORDED ---
  async notifyTransactionRecorded(data: {
    treasuryName?: string;
    type: string;
    amount: string;
    tokenSymbol?: string;
    fromAddress: string;
    toAddress: string;
    txHash: string;
    status: string;
  }): Promise<void> {
    const symbol = data.tokenSymbol || 'NEAR';
    const statusEmoji = data.status === 'CONFIRMED' ? '✅' : data.status === 'FAILED' ? '❌' : '⏳';
    const explorerLink = this.getExplorerUrl(data.txHash);

    const message = [
      `<b>${statusEmoji} NearGear: Transaction ${data.status}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      data.treasuryName ? `🏛 <b>Treasury:</b> ${data.treasuryName}` : '',
      `💸 <b>Type:</b> <code>${data.type}</code>`,
      `💰 <b>Amount:</b> <code>${data.amount} ${symbol}</code>`,
      `📤 <b>From:</b> <code>${data.fromAddress}</code>`,
      `📥 <b>To:</b> <code>${data.toAddress}</code>`,
      `🔗 <b>Explorer:</b> <a href="${explorerLink}">${data.txHash.slice(0, 10)}...${data.txHash.slice(-8)}</a>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>Smart AI. Secure Treasury.</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendMessage(message);
  }

  // --- 2. TRANSACTION PROPOSED ---
  async notifyTransactionProposed(data: {
    treasuryName?: string;
    actionType: string;
    amount: string;
    tokenSymbol?: string;
    recipientAddress: string;
    reason?: string;
    approvalId?: string;
  }): Promise<void> {
    const symbol = data.tokenSymbol || 'NEAR';

    const message = [
      `<b>📝 NearGear: Transaction Proposal Created</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      data.treasuryName ? `🏛 <b>Treasury:</b> ${data.treasuryName}` : '',
      `📋 <b>Action:</b> <code>${data.actionType}</code>`,
      `💰 <b>Amount:</b> <code>${data.amount} ${symbol}</code>`,
      `📥 <b>Recipient:</b> <code>${data.recipientAddress}</code>`,
      data.reason ? `💬 <b>Reason:</b> <i>${data.reason}</i>` : '',
      `⏳ <b>Status:</b> Awaiting Human Owner Review`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>Review in NearGear Dashboard under Approvals</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendMessage(message);
  }

  // --- 3. APPROVAL DECISION ---
  async notifyApprovalDecision(data: {
    treasuryName?: string;
    status: 'APPROVED' | 'REJECTED' | 'EXECUTED';
    amount?: string;
    tokenSymbol?: string;
    recipientAddress?: string;
    reason?: string;
  }): Promise<void> {
    const symbol = data.tokenSymbol || 'NEAR';
    const isApproved = data.status === 'APPROVED' || data.status === 'EXECUTED';
    const emoji = isApproved ? '✅' : '❌';

    const message = [
      `<b>${emoji} NearGear: Proposal ${data.status}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      data.treasuryName ? `🏛 <b>Treasury:</b> ${data.treasuryName}` : '',
      data.amount ? `💰 <b>Amount:</b> <code>${data.amount} ${symbol}</code>` : '',
      data.recipientAddress ? `📥 <b>Recipient:</b> <code>${data.recipientAddress}</code>` : '',
      data.reason ? `💬 <b>Notes:</b> <i>${data.reason}</i>` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>Managed via NearGear Security Engine</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendMessage(message);
  }

  // --- 4. AI AGENT PAYMENT AUTO-APPROVED ---
  async notifyAgentSpendApproved(data: {
    treasuryName?: string;
    agentName: string;
    agentAccountId: string;
    amount: string;
    tokenSymbol?: string;
    recipientAddress: string;
    task: string;
    reason?: string;
  }): Promise<void> {
    const symbol = data.tokenSymbol || 'NEAR';

    const message = [
      `<b>⚡ NearGear: AI Agent Payment Auto-Approved</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      data.treasuryName ? `🏛 <b>Treasury:</b> ${data.treasuryName}` : '',
      `🤖 <b>Agent:</b> ${data.agentName} (<code>${data.agentAccountId}</code>)`,
      `🎯 <b>Task Category:</b> <code>${data.task}</code>`,
      `💰 <b>Amount:</b> <code>${data.amount} ${symbol}</code>`,
      `📥 <b>Approved Vendor:</b> <code>${data.recipientAddress}</code>`,
      `🛡 <b>Policy Checks:</b> Recipient Whitelist ✅ | Task Category ✅ | Time Window ✅ | Instant Cap (≤5 NEAR) ✅`,
      data.reason ? `💬 <b>Purpose:</b> <i>${data.reason}</i>` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>Autonomous disbursement processed within business rules</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendMessage(message);
  }

  // --- 5. AI AGENT PAYMENT REQUIRES HUMAN APPROVAL ---
  async notifyAgentSpendApprovalRequired(data: {
    treasuryName?: string;
    agentName: string;
    agentAccountId: string;
    amount: string;
    tokenSymbol?: string;
    recipientAddress: string;
    task: string;
    instantLimit: string;
    approvalId?: string;
    reason?: string;
  }): Promise<void> {
    const symbol = data.tokenSymbol || 'NEAR';

    const message = [
      `<b>⚠️ NearGear: Agent High-Value Payment Requires Approval</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      data.treasuryName ? `🏛 <b>Treasury:</b> ${data.treasuryName}` : '',
      `🤖 <b>Agent:</b> ${data.agentName} (<code>${data.agentAccountId}</code>)`,
      `💰 <b>Requested:</b> <code>${data.amount} ${symbol}</code>`,
      `🛑 <b>Threshold Exceeded:</b> Instant limit is <code>${data.instantLimit} ${symbol}</code>`,
      `🎯 <b>Task:</b> <code>${data.task}</code>`,
      `📥 <b>Recipient:</b> <code>${data.recipientAddress}</code>`,
      `⏳ <b>Status:</b> <b>ACTION REQUIRED — Pending Owner Approval</b>`,
      data.reason ? `💬 <b>Details:</b> <i>${data.reason}</i>` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>Log in to the dashboard to approve or reject this request</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendMessage(message);
  }

  // --- 6. AI AGENT PAYMENT BLOCKED BY SECURITY POLICY ---
  async notifyAgentSpendBlocked(data: {
    treasuryName?: string;
    agentName: string;
    agentAccountId: string;
    amount: string;
    tokenSymbol?: string;
    recipientAddress: string;
    task: string;
    violations: string[];
  }): Promise<void> {
    const symbol = data.tokenSymbol || 'NEAR';
    const violationsFormatted = data.violations.map((v) => `• <i>${v}</i>`).join('\n');

    const message = [
      `<b>🚨 NearGear Security Alert: Payment Request Blocked</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      data.treasuryName ? `🏛 <b>Treasury:</b> ${data.treasuryName}` : '',
      `🤖 <b>Agent:</b> ${data.agentName} (<code>${data.agentAccountId}</code>)`,
      `💸 <b>Blocked Amount:</b> <code>${data.amount} ${symbol}</code>`,
      `📥 <b>Target:</b> <code>${data.recipientAddress}</code>`,
      `🎯 <b>Task:</b> <code>${data.task}</code>`,
      `❌ <b>Rule Violations:</b>`,
      violationsFormatted,
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>NearGear stopped this unauthorized payment before funds could leave</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendMessage(message);
  }

  // --- 7. RULE ENGINE TRIGGER ---
  async notifyRuleTriggered(data: {
    treasuryName?: string;
    ruleName: string;
    reason: string;
    severity?: string;
  }): Promise<void> {
    const severity = data.severity || 'WARNING';
    const emoji = severity === 'CRITICAL' ? '🚨' : severity === 'WARNING' ? '⚠️' : 'ℹ️';

    const message = [
      `<b>${emoji} NearGear Rule Alert: ${data.ruleName}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      data.treasuryName ? `🏛 <b>Treasury:</b> ${data.treasuryName}` : '',
      `🔔 <b>Condition:</b> ${data.reason}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>Automated Rule Evaluation Engine</i>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendMessage(message);
  }
}

