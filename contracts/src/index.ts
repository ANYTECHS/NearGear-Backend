import {
  NearBindgen,
  near,
  call,
  view,
  initialize,
  UnorderedSet,
  assert,
} from 'near-sdk-js';

const ONE_DAY_NS = BigInt(24 * 60 * 60 * 1_000_000_000);

export interface SpendingStatus {
  max_transaction_amount: string;
  daily_spending_limit: string;
  spent_today: string;
  remaining_today: string;
}

@NearBindgen({ requireInit: true })
export class TreasuryVault {
  owner_id: string = '';
  _paused: boolean = false;
  authorized_agents: UnorderedSet<string> = new UnorderedSet<string>('a');
  approved_recipients: UnorderedSet<string> = new UnorderedSet<string>('r');
  whitelist_recipients_enabled: boolean = false;
  daily_spending_limit: bigint = BigInt('10000000000000000000000000'); // 10 NEAR
  max_transaction_amount: bigint = BigInt('2000000000000000000000000'); // 2 NEAR
  spent_today: bigint = BigInt(0);
  last_spending_reset: bigint = BigInt(0);

  @initialize({})
  init({
    owner_id,
    daily_spending_limit,
    max_transaction_amount,
  }: {
    owner_id?: string;
    daily_spending_limit?: string;
    max_transaction_amount?: string;
  }) {
    this.owner_id = owner_id || near.predecessorAccountId();
    this._paused = false;
    this.whitelist_recipients_enabled = false;
    if (daily_spending_limit) {
      this.daily_spending_limit = BigInt(daily_spending_limit);
    }
    if (max_transaction_amount) {
      this.max_transaction_amount = BigInt(max_transaction_amount);
    }
    this.spent_today = BigInt(0);
    this.last_spending_reset = near.blockTimestamp();
  }

  // --- ACCESS CONTROLS ---

  private assertOwner() {
    assert(
      near.predecessorAccountId() === this.owner_id,
      'Only the vault owner can call this method',
    );
  }

  @call({})
  transfer_ownership({ new_owner }: { new_owner: string }) {
    this.assertOwner();
    assert(new_owner && new_owner.length >= 2, 'Invalid new owner account');
    near.log(`Ownership transferred from ${this.owner_id} to ${new_owner}`);
    this.owner_id = new_owner;
  }

  @call({})
  pause() {
    this.assertOwner();
    this._paused = true;
    near.log('Treasury vault paused');
  }

  @call({})
  unpause() {
    this.assertOwner();
    this._paused = false;
    near.log('Treasury vault unpaused');
  }

  @call({})
  authorize_agent({ agent_id }: { agent_id: string }) {
    this.assertOwner();
    this.authorized_agents.set(agent_id);
    near.log(`Agent authorized: ${agent_id}`);
  }

  @call({})
  deauthorize_agent({ agent_id }: { agent_id: string }) {
    this.assertOwner();
    this.authorized_agents.remove(agent_id);
    near.log(`Agent deauthorized: ${agent_id}`);
  }

  @call({})
  approve_recipient({ recipient_id }: { recipient_id: string }) {
    this.assertOwner();
    this.approved_recipients.set(recipient_id);
    near.log(`Recipient approved: ${recipient_id}`);
  }

  @call({})
  revoke_recipient({ recipient_id }: { recipient_id: string }) {
    this.assertOwner();
    this.approved_recipients.remove(recipient_id);
    near.log(`Recipient revoked: ${recipient_id}`);
  }

  @call({})
  set_whitelist_enabled({ enabled }: { enabled: boolean }) {
    this.assertOwner();
    this.whitelist_recipients_enabled = Boolean(enabled);
    near.log(`Recipient whitelist enforcement set to ${enabled}`);
  }

  @call({})
  set_limits({
    daily_spending_limit,
    max_transaction_amount,
  }: {
    daily_spending_limit: string;
    max_transaction_amount: string;
  }) {
    this.assertOwner();
    this.daily_spending_limit = BigInt(daily_spending_limit);
    this.max_transaction_amount = BigInt(max_transaction_amount);
    near.log(
      `Limits updated: daily=${this.daily_spending_limit}, max_tx=${this.max_transaction_amount}`,
    );
  }

  // --- DEPOSIT ---

  @call({ payableFunction: true })
  deposit_near() {
    const attached = near.attachedDeposit();
    assert(attached > BigInt(0), 'Must attach deposit greater than 0');
    near.log(
      JSON.stringify({
        standard: 'vaultiq',
        version: '1.0.0',
        event: 'treasury_deposit',
        data: {
          sender: near.predecessorAccountId(),
          amount: attached.toString(),
        },
      }),
    );
  }

  // --- DISBURSE / TRANSFER ---

  @call({})
  execute_transfer({
    recipient_id,
    amount,
    reason,
  }: {
    recipient_id: string;
    amount: string;
    reason?: string;
  }) {
    assert(!this._paused, 'Treasury vault is currently paused');

    const caller = near.predecessorAccountId();
    const isOwner = caller === this.owner_id;
    const isAgent = this.authorized_agents.contains(caller);

    assert(
      isOwner || isAgent,
      'Caller is not authorized to disburse funds from this vault',
    );

    const transferAmount = BigInt(amount);
    assert(transferAmount > BigInt(0), 'Transfer amount must be greater than zero');

    // Policy enforcement for AI agents
    if (!isOwner && isAgent) {
      if (this.whitelist_recipients_enabled) {
        assert(
          this.approved_recipients.contains(recipient_id),
          'Recipient is not on the approved recipient list',
        );
      }

      assert(
        transferAmount <= this.max_transaction_amount,
        'Transfer amount exceeds maximum per-transaction limit for agents',
      );

      const currentTime = near.blockTimestamp();
      if (currentTime >= this.last_spending_reset + ONE_DAY_NS) {
        this.spent_today = BigInt(0);
        this.last_spending_reset = currentTime;
      }

      const newSpent = this.spent_today + transferAmount;
      assert(
        newSpent <= this.daily_spending_limit,
        'Transfer exceeds configured 24-hour daily spending limit for agents',
      );

      this.spent_today = newSpent;
    }

    const reasonStr = reason || 'Automated treasury transfer';
    near.log(
      JSON.stringify({
        standard: 'vaultiq',
        version: '1.0.0',
        event: 'treasury_transfer',
        data: {
          sender: caller,
          recipient: recipient_id,
          amount: transferAmount.toString(),
          reason: reasonStr,
        },
      }),
    );

    // Transfer native NEAR
    const promise = near.promiseBatchCreate(recipient_id);
    near.promiseBatchActionTransfer(promise, transferAmount);
  }

  // --- VIEW METHODS ---

  @view({})
  get_owner(): string {
    return this.owner_id;
  }

  @view({})
  owner(): string {
    return this.owner_id;
  }

  @view({})
  is_paused(): boolean {
    return this._paused;
  }

  @view({})
  paused(): boolean {
    return this._paused;
  }

  @view({})
  is_agent_authorized({ agent_id }: { agent_id: string }): boolean {
    return this.authorized_agents.contains(agent_id);
  }

  @view({})
  is_recipient_approved({ recipient_id }: { recipient_id: string }): boolean {
    return this.approved_recipients.contains(recipient_id);
  }

  @view({})
  is_whitelist_enabled(): boolean {
    return this.whitelist_recipients_enabled;
  }

  @view({})
  get_spending_status(): SpendingStatus {
    const currentTime = near.blockTimestamp();
    const effectiveSpent =
      currentTime >= this.last_spending_reset + ONE_DAY_NS
        ? BigInt(0)
        : this.spent_today;

    const remaining =
      this.daily_spending_limit > effectiveSpent
        ? this.daily_spending_limit - effectiveSpent
        : BigInt(0);

    return {
      max_transaction_amount: this.max_transaction_amount.toString(),
      daily_spending_limit: this.daily_spending_limit.toString(),
      spent_today: effectiveSpent.toString(),
      remaining_today: remaining.toString(),
    };
  }

  @view({})
  get_authorized_agents(): string[] {
    return this.authorized_agents.toArray();
  }

  @view({})
  get_approved_recipients(): string[] {
    return this.approved_recipients.toArray();
  }
}
