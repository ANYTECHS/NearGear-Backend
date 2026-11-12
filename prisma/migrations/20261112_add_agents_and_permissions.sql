-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SpendRequestStatus" AS ENUM ('AUTO_APPROVED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'BLOCKED_BY_POLICY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "TreasurySnapshot" ADD COLUMN IF NOT EXISTS "nearValueUsd" DECIMAL(30,8);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Agent" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enforceWhitelist" BOOLEAN NOT NULL DEFAULT true,
    "instantSpendingLimit" DECIMAL(30,18) NOT NULL DEFAULT 5.0,
    "dailySpendingLimit" DECIMAL(30,18) NOT NULL DEFAULT 20.0,
    "spentToday" DECIMAL(30,18) NOT NULL DEFAULT 0.0,
    "lastSpendingReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedTasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enforceTaskWhitelist" BOOLEAN NOT NULL DEFAULT true,
    "timeWindowEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startHourUtc" INTEGER NOT NULL DEFAULT 8,
    "endHourUtc" INTEGER NOT NULL DEFAULT 18,
    "allowedDaysOfWeek" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentSpendRequest" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "amount" DECIMAL(30,18) NOT NULL,
    "tokenSymbol" TEXT NOT NULL DEFAULT 'NEAR',
    "task" TEXT NOT NULL,
    "reason" TEXT,
    "status" "SpendRequestStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "policyViolations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvalId" TEXT,
    "txHash" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSpendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Agent_treasuryId_idx" ON "Agent"("treasuryId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Agent_treasuryId_accountId_key" ON "Agent"("treasuryId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AgentSpendRequest_approvalId_key" ON "AgentSpendRequest"("approvalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentSpendRequest_treasuryId_idx" ON "AgentSpendRequest"("treasuryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentSpendRequest_agentId_idx" ON "AgentSpendRequest"("agentId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Agent" ADD CONSTRAINT "Agent_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AgentSpendRequest" ADD CONSTRAINT "AgentSpendRequest_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AgentSpendRequest" ADD CONSTRAINT "AgentSpendRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AgentSpendRequest" ADD CONSTRAINT "AgentSpendRequest_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

