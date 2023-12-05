/*
  Warnings:

  - You are about to drop the column `subdivisionId` on the `HomeOwners` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "HomeOwners_subdivisionId_key";

-- AlterTable
ALTER TABLE "HomeOwners" DROP COLUMN "subdivisionId";
