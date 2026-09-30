-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('STARTUP', 'COMPANY', 'NON_PROFIT', 'ACADEMIC', 'RESEARCH_ORGANIZATION', 'GOVERNMENT_ENTITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL_ENTRY', 'REGISTERED_PROVIDER', 'STARTUP_REGISTRY', 'GOVERNMENT_CHALLENGE', 'PUBLIC_CATALOG', 'OPEN_WEB', 'PARTNER_ECOSYSTEM');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'SOURCE_VERIFIED', 'GOVERNMENT_VERIFIED');

-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CandidateMatchStatus" AS ENUM ('DISCOVERED', 'UNDER_REVIEW', 'SHORTLISTED', 'NOT_RELEVANT');

-- CreateTable
CREATE TABLE "solution_providers" (
    "id" TEXT NOT NULL,
    "organizationName" VARCHAR(300) NOT NULL,
    "providerType" "ProviderType" NOT NULL DEFAULT 'OTHER',
    "website" VARCHAR(500),
    "description" TEXT,
    "headquarters" VARCHAR(300),
    "operatingRegions" JSONB,
    "domains" JSONB,
    "capabilities" JSONB,
    "contactInformation" JSONB,
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL_ENTRY',
    "sourceReference" VARCHAR(500),
    "sourceLastUpdated" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solution_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solutions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "problemAreas" JSONB,
    "capabilities" JSONB,
    "domains" JSONB,
    "deploymentModel" VARCHAR(200),
    "targetUsers" JSONB,
    "operatingEnvironment" TEXT,
    "geographicAvailability" JSONB,
    "integrationCapabilities" JSONB,
    "technologyDescription" TEXT,
    "evidenceSummary" TEXT,
    "sourceReference" VARCHAR(500),
    "sourceLastUpdated" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_runs" (
    "id" TEXT NOT NULL,
    "governmentNeedId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "criteriaSnapshot" JSONB NOT NULL,
    "sourceTypes" JSONB NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_candidates" (
    "id" TEXT NOT NULL,
    "governmentNeedId" TEXT NOT NULL,
    "discoveryRunId" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "matchStatus" "CandidateMatchStatus" NOT NULL DEFAULT 'DISCOVERED',
    "aiRelevanceScore" INTEGER,
    "aiRelevanceLevel" VARCHAR(10),
    "aiMatchExplanation" JSONB,
    "aiProvider" VARCHAR(100),
    "aiModel" VARCHAR(100),
    "aiPromptVersion" VARCHAR(50),
    "aiGeneratedAt" TIMESTAMP(3),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "humanReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "notRelevantReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_criteria" (
    "id" TEXT NOT NULL,
    "governmentNeedId" TEXT NOT NULL,
    "capabilities" JSONB,
    "problemKeywords" JSONB,
    "outcomeKeywords" JSONB,
    "domain" VARCHAR(100),
    "subDomain" VARCHAR(100),
    "geographicScope" VARCHAR(500),
    "operatingEnv" VARCHAR(500),
    "constraints" JSONB,
    "targetUsers" JSONB,
    "techPreferences" JSONB,
    "techExclusions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solution_providers_providerType_idx" ON "solution_providers"("providerType");

-- CreateIndex
CREATE INDEX "solution_providers_sourceType_idx" ON "solution_providers"("sourceType");

-- CreateIndex
CREATE INDEX "solutions_providerId_idx" ON "solutions"("providerId");

-- CreateIndex
CREATE INDEX "solutions_verificationStatus_idx" ON "solutions"("verificationStatus");

-- CreateIndex
CREATE INDEX "discovery_runs_governmentNeedId_idx" ON "discovery_runs"("governmentNeedId");

-- CreateIndex
CREATE INDEX "discovery_runs_initiatedById_idx" ON "discovery_runs"("initiatedById");

-- CreateIndex
CREATE INDEX "discovery_runs_status_idx" ON "discovery_runs"("status");

-- CreateIndex
CREATE INDEX "discovery_candidates_governmentNeedId_idx" ON "discovery_candidates"("governmentNeedId");

-- CreateIndex
CREATE INDEX "discovery_candidates_discoveryRunId_idx" ON "discovery_candidates"("discoveryRunId");

-- CreateIndex
CREATE INDEX "discovery_candidates_matchStatus_idx" ON "discovery_candidates"("matchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_candidates_governmentNeedId_discoveryRunId_soluti_key" ON "discovery_candidates"("governmentNeedId", "discoveryRunId", "solutionId");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_criteria_governmentNeedId_key" ON "discovery_criteria"("governmentNeedId");

-- AddForeignKey
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "solution_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_governmentNeedId_fkey" FOREIGN KEY ("governmentNeedId") REFERENCES "government_needs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_candidates" ADD CONSTRAINT "discovery_candidates_governmentNeedId_fkey" FOREIGN KEY ("governmentNeedId") REFERENCES "government_needs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_candidates" ADD CONSTRAINT "discovery_candidates_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "discovery_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_candidates" ADD CONSTRAINT "discovery_candidates_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "solutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_candidates" ADD CONSTRAINT "discovery_candidates_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_criteria" ADD CONSTRAINT "discovery_criteria_governmentNeedId_fkey" FOREIGN KEY ("governmentNeedId") REFERENCES "government_needs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
