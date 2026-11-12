# NearGear — AI Treasury & Agent Security

### Tagline: *Smart AI. Secure Treasury.*
**Your AI Agents. Your Rules.**

NearGear is an on-chain AI-powered treasury management and autonomous agent security platform built for the **NEAR Protocol** ecosystem. 

> **The Central Idea:**  
> **Businesses can give AI agents permission to spend money, but NearGear makes sure they spend only within the rules established by the business.**

---

## 🛡️ The 4 Core Agent Security Permissions

NearGear provides a multi-layered security framework enforced both **on-chain at the smart contract level** and through an **intelligent backend spending gateway**:

```mermaid
flowchart TD
    Req["AI Agent Spend Request\n(POST /api/agent/spend-request)"] --> C1{"1. Approved Recipient Check"}
    C1 -- "Unknown / Unapproved Wallet" --> B1["❌ BLOCKED: UNAPPROVED_RECIPIENT\n(Critical Security Alert Created)"]
    C1 -- "Whitelisted Recipient" --> C2{"2. Task-Based Permission Check"}
    C2 -- "Unapproved Task (e.g. Luxury Goods)" --> B2["❌ BLOCKED: UNAPPROVED_TASK\n(Category Policy Violation)"]
    C2 -- "Approved Task (e.g. Research APIs, Cloud)" --> C3{"3. Time-Based Window Check"}
    C3 -- "Outside Window (e.g. 2:00 AM UTC)" --> B3["❌ BLOCKED: OUTSIDE_TIME_WINDOW\n(Restricted Operating Hours)"]
    C3 -- "Within Hours (e.g. 8 AM - 6 PM UTC)" --> C4{"4. Approval Threshold Check"}
    C4 -- "Amount <= 5 NEAR (Instant Limit)" --> A1["✅ AUTO_APPROVED\n(Instant On-Chain Disbursement)"]
    C4 -- "Amount > 5 NEAR (High Value)" --> A2["⏳ PENDING_APPROVAL\n(Owner Sign-Off Required in /api/approvals)"]
```

### 1. Approved Recipient Permission
* **Rule:** The AI agent can **only** send payments to wallet addresses pre-approved by the treasury owner.
* **Example:** A Computing Agent can pay an approved cloud provider (`hosting-provider.testnet`) but cannot send funds to an unknown or attacker wallet.
* **Enforcement:** Enforced on-chain via `approved_recipients` in [`contracts/src/index.ts`](file:///c:/Users/DELL/Desktop/NEAR/NearGuard-Backend/contracts/src/index.ts) and validated in [`AgentPermissionsService`](file:///c:/Users/DELL/Desktop/NEAR/NearGuard-Backend/src/agent/agent-permissions.service.ts). Unapproved destinations are rejected immediately.

### 2. Transaction Approval Permission
* **Rule:** Payments above a specified amount require human approval; payments within the instant threshold execute automatically.
* **Example:** Payments up to 5 NEAR are auto-approved; payments exceeding 5 NEAR are routed to the treasury owner for review and sign-off.
* **Enforcement:** The gateway splits requests based on `instantSpendingLimit`:
  - $\le 5$ NEAR: Marked `AUTO_APPROVED` and disbursed instantly.
  - $> 5$ NEAR: Marked `PENDING_APPROVAL`, creates a formal `Approval` request, and alerts the business owner.

### 3. Task-Based Permission
* **Rule:** The AI agent can **only** spend on tasks or services approved by the owner.
* **Example:** An agent can pay for research APIs (`research_apis`) or cloud infrastructure (`cloud_hosting`), but cannot use treasury funds for unrelated purchases.
* **Enforcement:** Evaluated against `approvedTasks` (`enforceTaskWhitelist: true`). Any request with an unlisted task category is blocked with `UNAPPROVED_TASK`.

### 4. Time-Based Permission
* **Rule:** The AI agent can **only** make payments during approved periods.
* **Example:** The agent can make payments between 8:00 AM and 6:00 PM UTC, Monday through Friday.
* **Enforcement:** Configurable `startHourUtc`, `endHourUtc`, and `allowedDaysOfWeek`. Out-of-hours requests are blocked with `OUTSIDE_TIME_WINDOW`.

---

## 🏛️ Smart Contract Architecture

The `TreasuryVault` contract is built using **`near-sdk-js`** ([`contracts/src/index.ts`](file:///c:/Users/DELL/Desktop/NEAR/NearGuard-Backend/contracts/src/index.ts)) and compiles to WebAssembly (`build/treasury_vault.wasm`).

### Key Contract Functions:
| Method | Type | Description |
| :--- | :--- | :--- |
| `authorize_agent({ agent_id })` | Call (Owner) | Grant spending permission to an autonomous AI agent account. |
| `deauthorize_agent({ agent_id })` | Call (Owner) | Immediately revoke an agent's spending permissions. |
| `approve_recipient({ recipient_id })` | Call (Owner) | Add a vendor to the approved recipient whitelist. |
| `revoke_recipient({ recipient_id })` | Call (Owner) | Remove a vendor from the recipient whitelist. |
| `approve_task({ task })` | Call (Owner) | Add an authorized task category (e.g. `research_apis`). |
| `set_time_window({ enabled, start_hour_utc, end_hour_utc })` | Call (Owner) | Configure operating hours on-chain. |
| `set_limits({ daily_spending_limit, max_transaction_amount })` | Call (Owner) | Configure rolling 24-hour limit and instant approval threshold. |
| `pause()` / `unpause()` | Call (Owner) | Emergency killswitch freezing all treasury disbursements. |
| `execute_transfer({ recipient_id, amount, task, reason })` | Call (Agent/Owner) | Executes transfer with full 4-permission validation for agents. |
| `get_spending_status()` | View | Returns instant limit, daily cap, spent today, and remaining allowance. |

---

## 📡 REST API & Swagger Documentation

Interactive OpenAPI documentation is available at `http://localhost:3750/api/docs` and exported to [`swagger.json`](file:///c:/Users/DELL/Desktop/NEAR/NearGuard-Backend/swagger.json).

### Agent Security & Spending Endpoints (`/api/agent`)
* `POST /api/agent/spend-request`: **Autonomous Agent Gateway** — processes and evaluates spend requests against the 4 permissions in real time.
* `POST /api/agent/:treasuryId/agents`: Register an AI Agent with customized permission rules.
* `GET /api/agent/:treasuryId/agents`: List all configured agents and active policies.
* `GET /api/agent/:treasuryId/agents/:agentId`: View agent policy details and spend history.
* `PATCH /api/agent/:treasuryId/agents/:agentId`: Update agent limits, whitelist, tasks, or time windows.
* `DELETE /api/agent/:treasuryId/agents/:agentId`: Remove agent from treasury.
* `GET /api/agent/:treasuryId/spend-requests`: Audit log of all agent spend requests, status, and policy violations.
* `POST /api/agent/chat`: Conversational AI Treasury Copilot grounded with real-time on-chain data.
* `POST /api/agent/:treasuryId/analyze`: Anomaly detection engine (burst detection, outlier payments $>3.5\times$ avg, low gas alerts).

### Treasury & Approvals Endpoints
* `GET /api/treasury`: List business treasuries.
* `GET /api/treasury/:id/overview`: Live balance overview (native NEAR, NEP-141 tokens, contract balance).
* `GET /api/approvals/:treasuryId`: View pending human approval requests.
* `POST /api/approvals/:treasuryId/:id/approve`: Approve a transaction exceeding instant limits.
* `POST /api/approvals/:treasuryId/:id/reject`: Reject a transaction proposal.
* `POST /api/approvals/:treasuryId/:id/execute`: Record on-chain execution hash and verify settlement.
* `POST /api/rules/:treasuryId/evaluate`: Trigger evaluation of active automated treasury rules.

### Telegram Notification Endpoints (`/api/notifications`)
* `GET /api/notifications/telegram/status`: Inspect Telegram bot connectivity and configuration.
* `POST /api/notifications/telegram/test`: Dispatch a test notification to verify delivery to Telegram.

---

## 📲 Real-Time Telegram Transaction Notifications

NearGear integrates with Telegram via **`@NearGearAIbot`** to give treasury owners real-time alerts on all financial operations:

```text
+---------------------------------------------------------------------------------+
|                                Telegram Alerts                                  |
+---------------------------------------------------------------------------------+
| 🟢 Transaction Confirmed      | Real-time transfer/deposit receipt & NEAR link  |
| ⚡ AI Agent Auto-Approved     | Payments <= 5 NEAR passing all 4 security rules |
| ⚠️ Human Approval Required   | Payments > 5 NEAR flagged for owner review      |
| 🚨 Security Policy Blocked    | Unauthorized wallet, task, or hours blocked    |
| ✅ / ❌ Approval Decision    | Owner approval/rejection updates                |
| 🔔 Treasury Rule Triggered    | Low native gas or volume threshold alerts       |
+---------------------------------------------------------------------------------+
```

### Setup Telegram Alerts:
1. Open Telegram and search for **`@NearGearAIbot`** (or go to `https://t.me/NearGearAIbot`).
2. Press **Start** (`/start`).
3. Set your `TELEGRAM_CHAT_ID` in `.env` (or pass `chatId` in the API).
4. Verify by calling `POST /api/notifications/telegram/test`.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Blockchain** | NEAR Protocol | High-speed, low-cost Layer 1 with native account abstraction. |
| **Smart Contract** | `near-sdk-js` | TypeScript smart contract compiled to WebAssembly (`.wasm`). |
| **Backend Framework**| NestJS (v11) | Modular enterprise Node.js framework with TypeScript. |
| **Database** | PostgreSQL (Neon) | Serverless PostgreSQL database with pooling. |
| **ORM** | Prisma (v7) | Schema management, type-safe queries, and migrations. |
| **AI Engine** | Groq SDK / LLaMA 3.3 | Real-time grounded reasoning and anomaly analysis. |
| **API Docs** | Swagger / OpenAPI 3.0 | Auto-generated interactive API documentation. |

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: v20 or v22
* **pnpm**: v10 (`npm i -g pnpm`)
* **NEAR Wallet**: Testnet account (e.g. `your-account.testnet`)

### 2. Installation
```bash
git clone <repository-url>
cd NearGuard-Backend

# Install dependencies
pnpm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3750
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=verify-full"
JWT_SECRET="your-secure-jwt-secret"
JWT_EXPIRES_IN=15m
FRONTEND_URL=http://localhost:3000

# AI Copilot (Groq)
AI_API_KEY="gsk_your_groq_api_key"
AI_MODEL="llama-3.3-70b-versatile"

# NEAR Protocol Configuration
NEAR_NETWORK=testnet
NEAR_RPC_URL=https://rpc.testnet.near.org
NEAR_ACCOUNT_ID=your-account.testnet
TREASURY_CONTRACT_ADDRESS=treasury.your-account.testnet
```

### 4. Database Setup & Prisma Generation
```bash
# Push schema to database
pnpm exec prisma db execute --file prisma/migrations/20261112_add_agents_and_permissions.sql

# Generate Prisma Client
pnpm exec prisma generate
```

### 5. Compile Contract (Optional)
```bash
cd contracts
npm install
npm run build
```

### 6. Run the Application
```bash
# Development mode
pnpm run start:dev

# Production build & run
pnpm run build
pnpm run start
```
* **API Server:** `http://localhost:3750`
* **Swagger Docs:** `http://localhost:3750/api/docs`
* **Health Check:** `http://localhost:3750/api/health`

---

## 🧪 Automated Testing

NearGuard includes a comprehensive automated test suite covering all services and the 4 core permission rules:

```bash
pnpm test
```

### Test Coverage Results:
```text
PASS src/agent/agent-permissions.service.spec.ts
  AgentPermissionsService — 4 Core Permissions
    1. Approved Recipient Permission
      ✓ should ALLOW payment when recipient is in approved whitelist
      ✓ should BLOCK payment when recipient is NOT in approved whitelist
    2. Transaction Approval Permission
      ✓ should AUTO_APPROVE payments <= 5 NEAR instant spending threshold
      ✓ should ROUTE TO HUMAN APPROVAL when payment > 5 NEAR threshold
    3. Task-Based Permission
      ✓ should ALLOW payment when spending on an approved task (e.g. research_apis)
      ✓ should BLOCK payment when spending on an unauthorized task category
    4. Time-Based Permission
      ✓ should BLOCK payment when request falls outside approved operating hours (e.g. 2 AM)
      ✓ should ALLOW payment when request falls inside approved operating hours (e.g. 10 AM)

PASS src/notifications/telegram.service.spec.ts
PASS src/treasury/treasury.service.spec.ts
PASS src/auth/auth.service.spec.ts
PASS src/transactions/transactions.service.spec.ts
PASS src/agent/agent-ai.service.spec.ts
PASS src/approvals/approvals.service.spec.ts
PASS src/agent/agent-permissions.service.spec.ts

Test Suites: 7 passed, 7 total
Tests:       34 passed, 34 total
Snapshots:   0 total
```

---

## 🏆 Hackathon Submission

Built for **NEAR HACKATHON 2026**.  
*NearGear bridges autonomous AI agents and programmable money, providing the financial governance businesses need to confidently deploy AI.*

## 📄 License
MIT License.
