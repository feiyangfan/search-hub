CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('queued', 'processing', 'indexed', 'failed');

-- CreateEnum
CREATE TYPE "public"."TenantRole" AS ENUM ('owner', 'admin', 'member');

-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."TenantRole" NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "content" TEXT,
    "mimeType" TEXT,
    "searchVector" tsvector NOT NULL DEFAULT ''::tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentChunk" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1024) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentIndexState" (
    "documentId" TEXT NOT NULL,
    "lastChecksum" TEXT NOT NULL,
    "lastIndexedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentIndexState_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "public"."IndexJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tenant_name_idx" ON "public"."Tenant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "TenantMembership_userId_idx" ON "public"."TenantMembership"("userId");

-- CreateIndex
CREATE INDEX "TenantMembership_tenantId_idx" ON "public"."TenantMembership"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "public"."TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "public"."Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_title_idx" ON "public"."Document"("title");

-- CreateIndex
CREATE INDEX "Document_tenantId_createdAt_idx" ON "public"."Document"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_searchVector_idx" ON "public"."Document" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "DocumentChunk_tenantId_idx" ON "public"."DocumentChunk"("tenantId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx_idx" ON "public"."DocumentChunk"("documentId", "idx");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_documentId_idx_key" ON "public"."DocumentChunk"("documentId", "idx");

-- CreateIndex
CREATE INDEX "IndexJob_tenantId_idx" ON "public"."IndexJob"("tenantId");

-- CreateIndex
CREATE INDEX "IndexJob_documentId_idx" ON "public"."IndexJob"("documentId");

-- CreateIndex
CREATE INDEX "IndexJob_status_idx" ON "public"."IndexJob"("status");

-- CreateIndex
CREATE INDEX "IndexJob_tenantId_documentId_status_idx" ON "public"."IndexJob"("tenantId", "documentId", "status");

-- AddForeignKey
ALTER TABLE "public"."TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentIndexState" ADD CONSTRAINT "DocumentIndexState_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IndexJob" ADD CONSTRAINT "IndexJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IndexJob" ADD CONSTRAINT "IndexJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "IndexJob_active_unique"
  ON "public"."IndexJob"("tenantId","documentId")
  WHERE "status" IN ('queued','processing');

CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_cosine_idx"
  ON "DocumentChunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

ANALYZE "DocumentChunk";
