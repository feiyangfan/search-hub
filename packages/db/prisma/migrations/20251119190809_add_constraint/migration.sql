/*
  Warnings:

  - A unique constraint covering the columns `[oauthProvider,oauthAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "User_oauthProvider_oauthAccountId_key" ON "public"."User"("oauthProvider", "oauthAccountId");
