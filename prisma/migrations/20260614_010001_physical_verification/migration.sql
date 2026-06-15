-- Physical (field) verification — a SEPARATE, OPTIONAL service from the online
-- BGV stages. The field team visits the candidate's addresses / college /
-- employers, confirms them on the ground, and photographs the site. It is never
-- required for clearance and is started manually (or triggered by the portal),
-- running in the background even after the candidate is onboarded.

-- CreateEnum
CREATE TYPE "PhysicalVerificationStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PhysicalVisitKind" AS ENUM ('ADDRESS', 'EDUCATION', 'EMPLOYMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PhysicalVisitStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISCREPANCY', 'UNABLE_TO_VERIFY');

-- CreateTable
CREATE TABLE "PhysicalVerification" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "PhysicalVerificationStatus" NOT NULL DEFAULT 'REQUESTED',
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "reason" TEXT,
    "startedById" TEXT,
    "assignedAgentId" TEXT,
    "summary" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalVisit" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "kind" "PhysicalVisitKind" NOT NULL,
    "status" "PhysicalVisitStatus" NOT NULL DEFAULT 'PENDING',
    "label" TEXT NOT NULL,
    "addressText" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "visitedAt" TIMESTAMP(3),
    "latitude" TEXT,
    "longitude" TEXT,
    "findings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalVisitPhoto" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "caption" TEXT,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "latitude" TEXT,
    "longitude" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhysicalVisitPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalVerification_caseId_key" ON "PhysicalVerification"("caseId");

-- CreateIndex
CREATE INDEX "PhysicalVerification_status_idx" ON "PhysicalVerification"("status");

-- CreateIndex
CREATE INDEX "PhysicalVisit_verificationId_idx" ON "PhysicalVisit"("verificationId");

-- CreateIndex
CREATE INDEX "PhysicalVisitPhoto_visitId_idx" ON "PhysicalVisitPhoto"("visitId");

-- AddForeignKey
ALTER TABLE "PhysicalVerification" ADD CONSTRAINT "PhysicalVerification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalVerification" ADD CONSTRAINT "PhysicalVerification_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalVerification" ADD CONSTRAINT "PhysicalVerification_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalVisit" ADD CONSTRAINT "PhysicalVisit_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "PhysicalVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalVisitPhoto" ADD CONSTRAINT "PhysicalVisitPhoto_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "PhysicalVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
