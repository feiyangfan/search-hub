-- AlterTable: Add timing fields to IndexJob
ALTER TABLE "IndexJob" ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3);

-- CreateIndex: Add index on createdAt for recent job queries
CREATE INDEX "IndexJob_createdAt_idx" ON "IndexJob"("createdAt" DESC);

-- Acknowledge existing pgvector index (created manually, already exists in DB)
-- CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_idx" ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
