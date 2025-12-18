-- AlterTable
ALTER TABLE "DocumentChunk" ADD COLUMN     "endPos" INTEGER,
ADD COLUMN     "headingPath" JSONB,
ADD COLUMN     "rawMarkdown" TEXT,
ADD COLUMN     "startPos" INTEGER;
