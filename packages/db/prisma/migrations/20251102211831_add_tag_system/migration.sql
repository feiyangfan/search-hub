-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentTag" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tag_tenantId_idx" ON "public"."Tag"("tenantId");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "public"."Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_tenantId_name_key" ON "public"."Tag"("tenantId", "name");

-- CreateIndex
CREATE INDEX "DocumentTag_documentId_idx" ON "public"."DocumentTag"("documentId");

-- CreateIndex
CREATE INDEX "DocumentTag_tagId_idx" ON "public"."DocumentTag"("tagId");

-- CreateIndex
CREATE INDEX "DocumentTag_addedById_idx" ON "public"."DocumentTag"("addedById");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTag_documentId_tagId_key" ON "public"."DocumentTag"("documentId", "tagId");

-- AddForeignKey
ALTER TABLE "public"."Tag" ADD CONSTRAINT "Tag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentTag" ADD CONSTRAINT "DocumentTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentTag" ADD CONSTRAINT "DocumentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentTag" ADD CONSTRAINT "DocumentTag_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
