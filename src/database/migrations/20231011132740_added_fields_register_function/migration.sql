-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_adminId_fkey";

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_companyBlockchainId_fkey";

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_paymentTermId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_customerContactId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_customerId_fkey";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "costing" JSONB,
ADD COLUMN     "employeeId" INTEGER,
ADD COLUMN     "itemTier" JSONB,
ALTER COLUMN "trialEndDate" DROP NOT NULL,
ALTER COLUMN "prefix" DROP NOT NULL,
ALTER COLUMN "adminId" DROP NOT NULL,
ALTER COLUMN "qbAccessToken" DROP NOT NULL,
ALTER COLUMN "qbRefreshToken" DROP NOT NULL,
ALTER COLUMN "realmId" DROP NOT NULL,
ALTER COLUMN "qbCompanyName" DROP NOT NULL,
ALTER COLUMN "qbCompanyEmail" DROP NOT NULL,
ALTER COLUMN "customersSyncedAt" DROP NOT NULL,
ALTER COLUMN "qbSync" DROP NOT NULL,
ALTER COLUMN "socketId" DROP NOT NULL,
ALTER COLUMN "qbRefeshTokenExpiry" DROP NOT NULL,
ALTER COLUMN "emailPreferences" DROP NOT NULL,
ALTER COLUMN "invoicePrefix" DROP NOT NULL,
ALTER COLUMN "paymentTermId" DROP NOT NULL,
ALTER COLUMN "companyBlockchainId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Companyinvoice" ALTER COLUMN "stripeId" DROP NOT NULL,
ALTER COLUMN "stripeHostedInvoiceUrl" DROP NOT NULL,
ALTER COLUMN "stripeInvoicePdf" DROP NOT NULL,
ALTER COLUMN "paidAt" DROP NOT NULL,
ALTER COLUMN "emailHistory" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "customerContactId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserAuth" ALTER COLUMN "resetPasswordToken" DROP NOT NULL,
ALTER COLUMN "resetPasswordExpires" DROP NOT NULL,
ALTER COLUMN "socialId" DROP NOT NULL,
ALTER COLUMN "connectorType" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CustomerContract" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "info" JSONB,
    "contactName" TEXT NOT NULL,
    "companyId" INTEGER,
    "customerId" INTEGER,
    "joblocationId" INTEGER,
    "paymenttermId" INTEGER,
    "inactiveAt" TIMESTAMP(3),
    "inactiveBy" TEXT,

    CONSTRAINT "CustomerContract_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Companyadmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "Paymentterm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_companyBlockchainId_fkey" FOREIGN KEY ("companyBlockchainId") REFERENCES "CompanyBlockchain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContract" ADD CONSTRAINT "CustomerContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContract" ADD CONSTRAINT "CustomerContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContract" ADD CONSTRAINT "CustomerContract_joblocationId_fkey" FOREIGN KEY ("joblocationId") REFERENCES "Joblocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContract" ADD CONSTRAINT "CustomerContract_paymenttermId_fkey" FOREIGN KEY ("paymenttermId") REFERENCES "Paymentterm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
