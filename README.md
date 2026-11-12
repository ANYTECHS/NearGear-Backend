# NearGear — NEAR Edition

### AI-Powered Treasury Management for Autonomous AI Agents

**Your AI Agents. Your Rules.**

NearGear is an AI-powered treasury management platform designed to help businesses manage how autonomous AI agents access and spend funds. It aims to combine AI-driven automation with programmable spending policies and blockchain-based transaction transparency on the NEAR ecosystem.

## The Problem

Businesses increasingly use AI agents to perform tasks such as data collection, research, cloud computing, and automated services.

However, allowing AI agents to access business funds without proper restrictions creates financial and security risks.

Businesses need a way to:
- Control how much each AI agent can spend.
- Restrict unauthorized payments.
- Monitor agent transactions.
- Review unusual spending activities.
- Maintain control over their treasury.

## Our Solution

NearGear aims to give businesses a secure treasury management dashboard where they can create AI agents, configure spending permissions, monitor payments, and enforce financial policies.

Instead of giving an AI agent unrestricted access to funds, businesses can define what the agent is allowed to do.

## Core Features

### 1. Treasury Dashboard
- View total treasury balance.
- Monitor daily spending.
- Track active AI agents.
- View recent transactions.

### 2. AI Agent Management
- Create and manage AI agents.
- Assign agents specific roles.
- Configure individual spending permissions.
- Monitor agent activity.

### 3. Spending Allowances
- Configure daily spending limits.
- Set maximum transaction amounts.
- Define approved recipients.
- Prevent spending outside configured policies.

### 4. Transaction Monitoring
- View transaction history.
- Monitor incoming and outgoing payments.
- Track AI agent payments.
- Access blockchain transaction details.

### 5. AI Treasury Assistant
- Ask questions about treasury activity.
- Review spending summaries.
- Identify unusual transaction patterns.
- Get financial activity insights.

### 6. Security and Approvals
- Enforce spending policies through smart contracts.
- Support approval workflows for restricted transactions.
- Monitor rejected payment requests.
- Keep business owners informed.

### 7. Notifications
- Receive transaction alerts.
- Monitor spending thresholds.
- Receive security notifications.
- Integrate Telegram notifications.

## NEAR Ecosystem Integration

NearGear is being adapted to the NEAR ecosystem.

Planned integration areas include:

- NEAR wallet connectivity.
- NEAR-compatible smart contracts.
- On-chain treasury operations.
- Agent spending permissions.
- Transaction monitoring.
- NEAR ecosystem payment infrastructure.

Potential technologies include NEAR Intents, NEAR AI Cloud, and other suitable NEAR developer tools where they support the implemented use cases.

**Note:** These integrations must be implemented and tested before being presented as completed features.

## Technology Stack

The proposed technology stack includes:

| Layer | Technology |
|---|---|
| Frontend | Next.js / React |
| Styling | Tailwind CSS |
| Backend | NestJS |
| Database | PostgreSQL |
| ORM | Prisma |
| Blockchain | NEAR Protocol |
| Smart Contracts | NEAR-compatible contracts |
| AI | LLM integration |
| Notifications | Telegram / In-app |
| Deployment | Docker / Cloud hosting |

The final stack may change based on the NEAR integration selected.

## How It Works

1. A business connects its NEAR wallet.
2. The business creates an AI agent.
3. The business assigns spending permissions.
4. The agent requests payment when completing a task.
5. The application checks the configured spending policies.
6. Authorized requests proceed through the implemented payment flow.
7. Restricted requests are rejected or sent for approval.
8. Treasury managers monitor activity through the dashboard.

## Project Structure

A proposed monorepo structure:

```text
neargear-near/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── public/
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── treasury/
│   │   ├── agents/
│   │   ├── allowances/
│   │   ├── transactions/
│   │   ├── notifications/
│   │   └── ai-assistant/
│   └── prisma/
│
├── contracts/
│   ├── src/
│   └── tests/
│
├── README.md
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Git
- PostgreSQL
- A NEAR development wallet for blockchain testing

### Clone the repository

```bash
git clone YOUR_PUBLIC_REPOSITORY_URL
cd neargear-near
```

### Install dependencies

```bash
cd frontend
npm install
```

Install backend dependencies separately:

```bash
cd ../backend
npm install
```

### Configure environment variables

Create `.env` files using the supplied `.env.example` templates.

Never commit private keys, wallet secrets, database credentials, or API keys.

### Run the application

Start the frontend and backend using their respective development commands.

See each application's README for its actual scripts and configuration.

## Security Considerations

NearGear is designed around controlled permissions rather than unrestricted AI access to funds.

Important security principles:

- Never expose wallet secrets in frontend code.
- Validate spending requests on the backend.
- Enforce critical spending restrictions at the smart-contract level.
- Validate recipient permissions.
- Record relevant transaction activity.
- Require human approval where configured.

## Roadmap

- [ ] Create the new NEAR Edition branding.
- [ ] Adapt the existing frontend.
- [ ] Integrate NEAR wallet connectivity.
- [ ] Implement NEAR-compatible treasury contracts.
- [ ] Implement agent spending permissions.
- [ ] Connect the backend to NEAR transaction data.
- [ ] Integrate the AI Treasury Assistant.
- [ ] Implement transaction notifications.
- [ ] Test authorized and rejected spending requests.
- [ ] Record the project demonstration.

## Hackathon

Built for **NEAR HACKATHON 2026**.

The project aims to explore how AI agents and programmable money can work together to support safer autonomous businesses.

## Disclaimer

NearGear is an experimental project. Blockchain integrations, payment flows, and security mechanisms must be tested before any production use. Testnet functionality should not be presented as production-ready financial infrastructure.

## License

MIT License (subject to the repository's final licensing decision).
