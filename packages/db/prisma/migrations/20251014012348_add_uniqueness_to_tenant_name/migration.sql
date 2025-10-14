/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."DocumentChunk_embedding_cosine_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_name_key" ON "public"."Tenant"("name");

-- CreateIndex Back
CREATE INDEX "DocumentChunk_embedding_cosine_idx" ON "public"."DocumentChunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
