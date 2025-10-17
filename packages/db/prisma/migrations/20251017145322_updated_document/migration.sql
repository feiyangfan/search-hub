/*
  Warnings:

  - You are about to drop the column `mimeType` on the `Document` table. All the data in the column will be lost.
  - The `source` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `createdById` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DocumentSource" AS ENUM ('editor', 'url');

-- AlterTable
ALTER TABLE "public"."Document" DROP COLUMN "mimeType",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "updatedById" TEXT NOT NULL,
DROP COLUMN "source",
ADD COLUMN     "source" "public"."DocumentSource" NOT NULL DEFAULT 'editor';

-- CreateTable
CREATE TABLE "public"."DocumentFavorite" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentCommand" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentFavorite_userId_idx" ON "public"."DocumentFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFavorite_documentId_userId_key" ON "public"."DocumentFavorite"("documentId", "userId");

-- CreateIndex
CREATE INDEX "DocumentCommand_documentId_idx" ON "public"."DocumentCommand"("documentId");

-- CreateIndex
CREATE INDEX "DocumentCommand_userId_idx" ON "public"."DocumentCommand"("userId");

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentFavorite" ADD CONSTRAINT "DocumentFavorite_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentFavorite" ADD CONSTRAINT "DocumentFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentCommand" ADD CONSTRAINT "DocumentCommand_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentCommand" ADD CONSTRAINT "DocumentCommand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
