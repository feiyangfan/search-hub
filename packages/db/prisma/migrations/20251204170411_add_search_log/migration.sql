-- CreateTable
CREATE TABLE "public"."SearchLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "searchType" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchLog_tenantId_userId_createdAt_idx" ON "public"."SearchLog"("tenantId", "userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SearchLog_tenantId_createdAt_idx" ON "public"."SearchLog"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SearchLog_tenantId_query_idx" ON "public"."SearchLog"("tenantId", "query");

-- CreateIndex
CREATE INDEX "SearchLog_createdAt_idx" ON "public"."SearchLog"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "public"."SearchLog" ADD CONSTRAINT "SearchLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SearchLog" ADD CONSTRAINT "SearchLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
