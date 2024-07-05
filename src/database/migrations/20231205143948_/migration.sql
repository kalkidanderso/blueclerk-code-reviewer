/*
  Warnings:

  - A unique constraint covering the columns `[subdivisionId]` on the table `HomeOwners` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subdivisionId` to the `HomeOwners` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HomeOwners" ADD COLUMN     "subdivisionId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "HomeOwners_subdivisionId_key" ON "HomeOwners"("subdivisionId");
