CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "content" TEXT;

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

-- Vector index (cosine)
CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_cosine_idx"
ON "DocumentChunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

ANALYZE "DocumentChunk";

-- CreateTable
CREATE TABLE "public"."DocumentIndexState" (
    "documentId" TEXT NOT NULL,
    "lastChecksum" TEXT NOT NULL,
    "lastIndexedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentIndexState_pkey" PRIMARY KEY ("documentId")
);

-- CreateIndex
CREATE INDEX "DocumentChunk_tenantId_idx" ON "public"."DocumentChunk"("tenantId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx_idx" ON "public"."DocumentChunk"("documentId", "idx");

-- AddForeignKey
ALTER TABLE "public"."DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
