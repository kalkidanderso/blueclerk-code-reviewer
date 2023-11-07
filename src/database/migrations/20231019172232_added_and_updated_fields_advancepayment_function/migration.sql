/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Advancepayment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Advancepayment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[advancePaymentId]` on the table `Advancepaymentemployee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[advancePaymentId]` on the table `Advancepaymentvendor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `advancePaymentId` to the `Advancepaymentemployee` table without a default value. This is not possible if the table is not empty.
  - Made the column `employeeId` on table `Advancepaymentemployee` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `advancePaymentId` to the `Advancepaymentvendor` table without a default value. This is not possible if the table is not empty.
  - Made the column `contractorId` on table `Advancepaymentvendor` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Advancepaymentemployee" DROP CONSTRAINT "Advancepaymentemployee_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Advancepaymentvendor" DROP CONSTRAINT "Advancepaymentvendor_contractorId_fkey";

-- DropIndex
DROP INDEX "Advancepayment_isVoid_appliedAt_idx";

-- AlterTable
ALTER TABLE "Advancepayment" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "referenceNumber" DROP NOT NULL,
ALTER COLUMN "paymentType" DROP NOT NULL,
ALTER COLUMN "paidAt" DROP NOT NULL,
ALTER COLUMN "appliedAt" DROP NOT NULL,
ALTER COLUMN "note" DROP NOT NULL,
ALTER COLUMN "isVoid" DROP NOT NULL,
ALTER COLUMN "voidedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Advancepaymentemployee" ADD COLUMN     "advancePaymentId" INTEGER NOT NULL,
ALTER COLUMN "employeeId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Advancepaymentvendor" ADD COLUMN     "advancePaymentId" INTEGER NOT NULL,
ALTER COLUMN "contractorId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Advancepayment_companyId_idx" ON "Advancepayment"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Advancepaymentemployee_advancePaymentId_key" ON "Advancepaymentemployee"("advancePaymentId");

-- CreateIndex
CREATE INDEX "Advancepaymentemployee_employeeId_idx" ON "Advancepaymentemployee"("employeeId");

-- CreateIndex
CREATE INDEX "Advancepaymentemployee_advancePaymentId_idx" ON "Advancepaymentemployee"("advancePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Advancepaymentvendor_advancePaymentId_key" ON "Advancepaymentvendor"("advancePaymentId");

-- CreateIndex
CREATE INDEX "Advancepaymentvendor_contractorId_idx" ON "Advancepaymentvendor"("contractorId");

-- CreateIndex
CREATE INDEX "Advancepaymentvendor_advancePaymentId_idx" ON "Advancepaymentvendor"("advancePaymentId");

-- AddForeignKey
ALTER TABLE "Advancepaymentvendor" ADD CONSTRAINT "Advancepaymentvendor_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepaymentvendor" ADD CONSTRAINT "Advancepaymentvendor_advancePaymentId_fkey" FOREIGN KEY ("advancePaymentId") REFERENCES "Advancepayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepaymentemployee" ADD CONSTRAINT "Advancepaymentemployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepaymentemployee" ADD CONSTRAINT "Advancepaymentemployee_advancePaymentId_fkey" FOREIGN KEY ("advancePaymentId") REFERENCES "Advancepayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
