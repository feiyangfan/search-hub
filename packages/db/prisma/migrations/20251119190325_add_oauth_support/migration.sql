-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "oauthAccountId" TEXT,
ADD COLUMN     "oauthProvider" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;
