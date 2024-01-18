-- CreateTable
CREATE TABLE "CustomerEquipment" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "CustomerEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReport" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "technicianName" TEXT NOT NULL,
    "jobDate" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "contractorId" INTEGER NOT NULL,
    "emailHistory" JSONB NOT NULL,
    "lastEmailSent" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceCreated" BOOLEAN NOT NULL,
    "invoiceVoid" BOOLEAN NOT NULL,
    "invoiceId" INTEGER NOT NULL,

    CONSTRAINT "JobReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "jobReportId" INTEGER,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "timeOfScan" TIMESTAMP(3) NOT NULL,
    "jobReportId" INTEGER,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_jobReportId_fkey" FOREIGN KEY ("jobReportId") REFERENCES "JobReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "CustomerEquipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_jobReportId_fkey" FOREIGN KEY ("jobReportId") REFERENCES "JobReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
