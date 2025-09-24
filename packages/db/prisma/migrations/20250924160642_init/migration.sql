-- CreateIndex
CREATE INDEX "Document_tenantId_createdAt_idx" ON "public"."Document"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "IndexJob_tenantId_documentId_status_idx" ON "public"."IndexJob"("tenantId", "documentId", "status");
