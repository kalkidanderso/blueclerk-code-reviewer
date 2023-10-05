/*
  Warnings:

  - You are about to drop the `_AdvancepaymentToCompanyLocation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AdvancepaymentToWorktype` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyLocationId` to the `Advancepayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workTypeId` to the `Advancepayment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_AdvancepaymentToCompanyLocation" DROP CONSTRAINT "_AdvancepaymentToCompanyLocation_A_fkey";

-- DropForeignKey
ALTER TABLE "_AdvancepaymentToCompanyLocation" DROP CONSTRAINT "_AdvancepaymentToCompanyLocation_B_fkey";

-- DropForeignKey
ALTER TABLE "_AdvancepaymentToWorktype" DROP CONSTRAINT "_AdvancepaymentToWorktype_A_fkey";

-- DropForeignKey
ALTER TABLE "_AdvancepaymentToWorktype" DROP CONSTRAINT "_AdvancepaymentToWorktype_B_fkey";

-- AlterTable
ALTER TABLE "Advancepayment" ADD COLUMN     "companyLocationId" INTEGER NOT NULL,
ADD COLUMN     "contractorId" INTEGER,
ADD COLUMN     "employeeId" INTEGER,
ADD COLUMN     "workTypeId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_AdvancepaymentToCompanyLocation";

-- DropTable
DROP TABLE "_AdvancepaymentToWorktype";

-- AddForeignKey
ALTER TABLE "Advancepayment" ADD CONSTRAINT "Advancepayment_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "Worktype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepayment" ADD CONSTRAINT "Advancepayment_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepayment" ADD CONSTRAINT "Advancepayment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepayment" ADD CONSTRAINT "Advancepayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
