# NearGear — NEAR Treasury Vault Smart Contract

Autonomous AI Agent Treasury Vault Smart Contract built with **`near-sdk-js`** (TypeScript).

---

## Overview

The `TreasuryVault` smart contract enforces on-chain programmable spending limits and access control for autonomous AI agents operating on NEAR Protocol.

### Core Features

1. **Autonomous Agent Whitelisting**:
   - Only explicitly approved agent accounts (`authorized_agents`) can disburse funds without owner intervention.
2. **Programmable Spending Limits**:
   - **Daily Spending Limit**: 24-hour rolling cap on total agent spending (default: 10 NEAR).
   - **Maximum Per-Transaction Amount**: Cap on single disbursements (default: 2 NEAR).
3. **Approved Recipient Whitelist**:
   - Optional whitelist enforcement so AI agents can only send payments to approved service providers, APIs, or vendor accounts.
4. **Emergency Controls**:
   - Immediate **pause/unpause** functionality by the vault owner.
5. **Auditable Event Logs**:
   - Emits structured `EVENT_JSON` standard logs for all deposits and transfers for indexers and backend audit trails.

---

## Contract Interface

### Initialization
```bash
near call <CONTRACT_ID> init '{"owner_id": "<OWNER_ACCOUNT_ID>", "daily_spending_limit": "10000000000000000000000000", "max_transaction_amount": "2000000000000000000000000"}' --accountId <OWNER_ACCOUNT_ID>
```

### Owner Administrative Methods
- `authorize_agent({ agent_id: string })`: Whitelist an AI agent account.
- `deauthorize_agent({ agent_id: string })`: Remove an AI agent account.
- `approve_recipient({ recipient_id: string })`: Add a vendor to approved recipient list.
- `revoke_recipient({ recipient_id: string })`: Remove a vendor from approved recipient list.
- `set_whitelist_enabled({ enabled: boolean })`: Toggle recipient whitelist enforcement.
- `set_limits({ daily_spending_limit: string, max_transaction_amount: string })`: Configure spending limits in yoctoNEAR.
- `pause()`: Halt all disbursements.
- `unpause()`: Resume disbursements.
- `transfer_ownership({ new_owner: string })`: Transfer vault ownership.

### Funding & Execution Methods
- `deposit_near()` (Payable): Deposit NEAR into the treasury vault.
- `execute_transfer({ recipient_id: string, amount: string, reason?: string })`:
  Disburse funds to `recipient_id`. Enforces all limits if called by an agent; bypasses limits if called by the owner.

### View Methods
- `get_owner()`: Returns vault owner account ID.
- `is_paused()`: Returns boolean paused state.
- `is_agent_authorized({ agent_id: string })`: Checks if agent is authorized.
- `is_recipient_approved({ recipient_id: string })`: Checks if recipient is approved.
- `get_spending_status()`: Returns `{ max_transaction_amount, daily_spending_limit, spent_today, remaining_today }`.
- `get_authorized_agents()`: Returns list of all authorized agent account IDs.
- `get_approved_recipients()`: Returns list of all approved vendor account IDs.

---

## Build & Deployment

### 1. Install Contract Dependencies
```bash
cd contracts
npm install
```

### 2. Compile to WebAssembly (.wasm)
```bash
npm run build
```
This produces `build/treasury_vault.wasm`.

### 3. Deploy to NEAR Testnet

#### Option A: Deploy to a Subaccount (Recommended)
```bash
# 1. Create subaccount
near create-account treasury.<YOUR_ACCOUNT>.testnet --masterAccount <YOUR_ACCOUNT>.testnet --initialBalance 5

# 2. Deploy and initialize contract
near deploy treasury.<YOUR_ACCOUNT>.testnet build/treasury_vault.wasm --initFunction init --initArgs '{"owner_id": "<YOUR_ACCOUNT>.testnet"}'
```

#### Option B: Quick Dev Deploy
```bash
near dev-deploy build/treasury_vault.wasm
near call <DEV_ACCOUNT_ID> init '{"owner_id": "<YOUR_ACCOUNT>.testnet"}' --accountId <YOUR_ACCOUNT>.testnet
```

