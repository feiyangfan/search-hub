/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,id]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."DocumentChunk" DROP CONSTRAINT "DocumentChunk_documentId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Document_tenantId_id_key" ON "public"."Document"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "public"."DocumentChunk" ADD CONSTRAINT "DocumentChunk_tenantId_documentId_fkey" FOREIGN KEY ("tenantId", "documentId") REFERENCES "public"."Document"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;