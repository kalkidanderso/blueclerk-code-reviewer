/*
  Warnings:

  - The values [POResquest] on the enum `serviceType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[alternativeId]` on the table `Servicetickets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "serviceType_new" AS ENUM ('Ticket', 'PORequest', 'AllPORequest');
ALTER TABLE "Servicetickets" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Servicetickets" ALTER COLUMN "type" TYPE "serviceType_new" USING ("type"::text::"serviceType_new");
ALTER TYPE "serviceType" RENAME TO "serviceType_old";
ALTER TYPE "serviceType_new" RENAME TO "serviceType";
DROP TYPE "serviceType_old";
ALTER TABLE "Servicetickets" ALTER COLUMN "type" SET DEFAULT 'Ticket';
COMMIT;

-- AlterTable
ALTER TABLE "Servicetickets" ADD COLUMN     "bouncedEmailFlag" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Servicetickets_alternativeId_key" ON "Servicetickets"("alternativeId");
