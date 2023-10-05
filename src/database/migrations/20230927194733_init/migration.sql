-- CreateEnum
CREATE TYPE "ChatChannels" AS ENUM ('serviceTicket', 'jobRequest', 'job');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "serviceType" AS ENUM ('Ticket', 'POResquest');

-- CreateEnum
CREATE TYPE "Item" AS ENUM ('Service', 'Product');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ServiceTicketCreated', 'ContractInvitation', 'ContractAccepted', 'ContractCanceled', 'ContractRejected', 'ContractFinished', 'JobRescheduled', 'CompanyInvoiceFailed', 'JobRequestCreated', 'JobRequestStatusUpdated', 'NewChat', 'ChatRead', 'JobCreated', 'JobUpdated');

-- CreateTable
CREATE TABLE "Advancepayment" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "referenceNumber" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "voidedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advancepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advancepaymentvendor" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "contractorId" INTEGER,

    CONSTRAINT "Advancepaymentvendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advancepaymentemployee" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "employeeId" INTEGER,

    CONSTRAINT "Advancepaymentemployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignedvendor" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "workTypes" JSONB NOT NULL,

    CONSTRAINT "Assignedvendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "chatChannel" "ChatChannels" NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "replyTo" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "readStatus" JSONB NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Companyadmin" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Companyadmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplieradmin" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,

    CONSTRAINT "Supplieradmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Companycustomer" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Companycustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Companyinvoice" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "technicians" INTEGER DEFAULT 0,
    "managers" INTEGER DEFAULT 0,
    "officeAdmins" INTEGER DEFAULT 0,
    "admins" INTEGER DEFAULT 0,
    "contractors" INTEGER DEFAULT 0,
    "charges" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "stripeId" TEXT NOT NULL,
    "stripeHostedInvoiceUrl" TEXT NOT NULL,
    "stripeInvoicePdf" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "companyId" INTEGER NOT NULL,
    "emailHistory" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Companyinvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Companyprefix" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "maxJobId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "Companyprefix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "contractorId" INTEGER NOT NULL,
    "contractorEmail" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdById" INTEGER NOT NULL,
    "finishedById" INTEGER NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "extraPermissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceType" INTEGER NOT NULL DEFAULT 0,
    "jobId" INTEGER,
    "purchaseOrderId" INTEGER,
    "estimateId" INTEGER,
    "jobPurchaseOrdersId" INTEGER,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "paymentTermId" INTEGER NOT NULL,
    "note" TEXT,
    "customerPO" TEXT NOT NULL,
    "customerContactId" INTEGER NOT NULL,
    "vendorId" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "jobLocationId" INTEGER NOT NULL,
    "jobSiteId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "charges" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "subTotal" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL,
    "taxPercentage" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB,
    "paymentApplied" INTEGER NOT NULL DEFAULT 0,
    "balanceDue" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "serviceType" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "emailHistory" JSONB NOT NULL,
    "bouncedEmailFlag" BOOLEAN NOT NULL DEFAULT false,
    "lastEmailSent" TIMESTAMP(3) NOT NULL,
    "quickbookId" TEXT NOT NULL,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "workTypeId" INTEGER NOT NULL,
    "companyLocationId" INTEGER NOT NULL,
    "technicianMessages" JSONB NOT NULL,
    "showJobId" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoicecommission" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "technicians" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoicecommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoiceprefix" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "maxInvoiceId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "Invoiceprefix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Joblocation" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contacts" JSONB NOT NULL,
    "location" JSONB,
    "address" JSONB,
    "jobSites" JSONB,
    "isActive" BOOLEAN,
    "customerId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "inactiveAt" TIMESTAMP(3),
    "inactiveById" INTEGER NOT NULL,
    "quickbookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Joblocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jobrequest" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "jobLocationId" INTEGER NOT NULL,
    "jobSiteId" INTEGER NOT NULL,
    "requests" JSONB NOT NULL,
    "customerId" INTEGER,
    "customerContactId" INTEGER,
    "companyId" INTEGER NOT NULL,
    "jobCreated" BOOLEAN NOT NULL DEFAULT false,
    "jobId" INTEGER NOT NULL,
    "track" JSONB NOT NULL,
    "createdById" INTEGER NOT NULL,
    "editedById" INTEGER NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL,
    "workTypeId" INTEGER NOT NULL,
    "companyLocationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jobrequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jobsite" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "name" TEXT,
    "location" JSONB,
    "isActive" BOOLEAN DEFAULT true,
    "address" JSONB,
    "locationId" INTEGER NOT NULL,
    "customerId" INTEGER,

    CONSTRAINT "Jobsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paymentterm" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dueDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" INTEGER NOT NULL,
    "quickbookId" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "deleteAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paymentterm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "referenceNumber" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "line" JSONB NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "quickbookId" TEXT NOT NULL,
    "quickbookRefNum" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "workType" JSONB NOT NULL,
    "companyLocation" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paymentcustomer" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "invoiceId" INTEGER,

    CONSTRAINT "Paymentcustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paymentvendor" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "contractorId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "offset" INTEGER NOT NULL,
    "creditUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Paymentvendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paymentemployee" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "invoices" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "offset" INTEGER NOT NULL,
    "creditUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Paymentemployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTicketTasks" (
    "id" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "jobTypeId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,

    CONSTRAINT "ServiceTicketTasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicetickets" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "customerId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "customerContactId" INTEGER,
    "customerPO" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "images" JSONB,
    "companyId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "track" JSONB NOT NULL,
    "editedById" INTEGER NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL,
    "ticketId" TEXT NOT NULL,
    "jobLocationId" INTEGER NOT NULL,
    "jobSiteId" INTEGER NOT NULL,
    "isHomeOccupied" BOOLEAN NOT NULL DEFAULT false,
    "homeOwnerId" INTEGER NOT NULL,
    "homeJobLocationId" INTEGER NOT NULL,
    "homeJobSiteId" INTEGER NOT NULL,
    "jobTypeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "jobCreated" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'blueclerk',
    "workTypeId" INTEGER NOT NULL,
    "companyLocationId" INTEGER NOT NULL,
    "pooverriddenById" INTEGER NOT NULL,
    "type" "serviceType" NOT NULL DEFAULT 'Ticket',
    "emailHistory" JSONB NOT NULL,
    "lastEmailSent" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicetickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worktype" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worktype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedEmployee" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "employeeId" INTEGER NOT NULL,

    CONSTRAINT "AssignedEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BouncedEmail" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BouncedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionHistory" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "technicianIdORContractorId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "commission" DOUBLE PRECISION,
    "addition" JSONB,
    "deduction" JSONB,
    "commissionType" TEXT,
    "editedUserId" INTEGER,
    "jobId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInfo" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT,
    "industryId" INTEGER,
    "logoUrl" TEXT,
    "companyEmail" TEXT,
    "displayName" TEXT,

    CONSTRAINT "CompanyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyBlockchain" (
    "id" SERIAL NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" INTEGER,
    "deniedAt" TIMESTAMP(3),
    "deniedById" INTEGER,

    CONSTRAINT "CompanyBlockchain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "companyInfoId" INTEGER,
    "address" JSONB,
    "contact" JSONB,
    "other" JSONB,
    "stripeId" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "type" INTEGER NOT NULL DEFAULT 0,
    "plan" INTEGER NOT NULL DEFAULT 0,
    "chargeDate" TIMESTAMP(3) NOT NULL,
    "trialEndDate" TIMESTAMP(3) NOT NULL,
    "maxTechnicians" INTEGER NOT NULL DEFAULT 0,
    "maxManagers" INTEGER NOT NULL DEFAULT 0,
    "maxOfficeAdmins" INTEGER NOT NULL DEFAULT 0,
    "maxAdmins" INTEGER NOT NULL DEFAULT 0,
    "userPermissions" JSONB NOT NULL,
    "currentJobId" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "qbAccessToken" TEXT NOT NULL,
    "qbRefreshToken" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "qbCompanyName" TEXT NOT NULL,
    "qbCompanyEmail" TEXT NOT NULL,
    "customersSynced" BOOLEAN,
    "customersSyncedAt" TIMESTAMP(3) NOT NULL,
    "qbSync" JSONB NOT NULL,
    "socketId" TEXT NOT NULL,
    "qbAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "qbRefeshTokenExpiry" TIMESTAMP(3) NOT NULL,
    "currentInvoiceId" INTEGER NOT NULL DEFAULT 0,
    "emailPreferences" JSONB NOT NULL,
    "invoicePrefix" TEXT NOT NULL,
    "currentPOId" INTEGER NOT NULL DEFAULT 0,
    "currentEstimateId" INTEGER NOT NULL DEFAULT 0,
    "paymentTermId" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "commission" INTEGER,
    "commissionType" TEXT NOT NULL DEFAULT '%',
    "companyBlockchainId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCard" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "ending" TEXT,
    "expirationMonth" TEXT,
    "expirationYear" TEXT,
    "cardType" TEXT,
    "name" TEXT,
    "token" TEXT,
    "cardStripeId" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyLocation" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMainLocation" BOOLEAN NOT NULL DEFAULT true,
    "contactName" TEXT NOT NULL,
    "info" JSONB NOT NULL,
    "address" JSONB NOT NULL,
    "isAddressAsBillingAddress" BOOLEAN NOT NULL DEFAULT false,
    "billingAddress" JSONB NOT NULL,
    "contact" JSONB NOT NULL,
    "companyId" INTEGER NOT NULL,
    "poRequestEmailSender" TEXT NOT NULL,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" INTEGER,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "profile" JSONB,
    "address" JSONB,
    "location" JSONB,
    "contact" JSONB,
    "permissions" JSONB,
    "emailPreferences" JSONB,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "commission" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "info" TEXT,
    "contactName" TEXT,
    "quickbookId" TEXT,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "itemTierId" INTEGER NOT NULL,
    "jobCostingId" INTEGER NOT NULL,
    "isCustomPrice" BOOLEAN NOT NULL,
    "customPrices" JSONB NOT NULL,
    "discountPrices" JSONB NOT NULL,
    "paymentTermId" INTEGER NOT NULL,
    "vendorId" TEXT NOT NULL,
    "inactiveAt" TIMESTAMP(3) NOT NULL,
    "inactiveById" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "isPORequired" BOOLEAN DEFAULT false,
    "notes" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDefault" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "updatedBy" INTEGER,
    "emailType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSchedule" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "userId" INTEGER NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "pulled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmailSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeOwners" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "info" JSONB NOT NULL,
    "contact" JSONB NOT NULL,
    "subdivisionId" INTEGER NOT NULL,
    "addressId" INTEGER NOT NULL,

    CONSTRAINT "HomeOwners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Industry" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "title" TEXT NOT NULL,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTier" (
    "id" SERIAL NOT NULL,
    "tierId" INTEGER NOT NULL,
    "charge" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemId" INTEGER NOT NULL,

    CONSTRAINT "ItemTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCosting" (
    "id" SERIAL NOT NULL,
    "tierId" INTEGER NOT NULL,
    "charge" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemId" INTEGER NOT NULL,

    CONSTRAINT "ItemCosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT true,
    "charges" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "isDiscountItem" BOOLEAN NOT NULL DEFAULT false,
    "isJobType" BOOLEAN NOT NULL DEFAULT true,
    "jobTypeId" INTEGER NOT NULL,
    "itemType" "Item" NOT NULL DEFAULT 'Service',
    "productCost" INTEGER NOT NULL,
    "salePrice" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "quickbookId" TEXT NOT NULL,
    "createdAt" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTaskJobType" (
    "id" SERIAL NOT NULL,
    "jobTypeId" INTEGER,
    "isSelfFinished" BOOLEAN DEFAULT false,
    "status" INTEGER DEFAULT 0,
    "charges" DOUBLE PRECISION DEFAULT 0.0,
    "startTime" TIMESTAMP(3),
    "tempStartTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "timeSpent" INTEGER DEFAULT 0,
    "pausedCount" INTEGER DEFAULT 0,
    "timeUpdatedById" INTEGER,
    "timeUpdatedAt" TIMESTAMP(3),
    "equipmentScanned" BOOLEAN DEFAULT false,
    "noOfEquipmentScanned" INTEGER DEFAULT 0,
    "quantity" INTEGER DEFAULT 0,
    "price" DOUBLE PRECISION,
    "completedCount" INTEGER,
    "completedComment" TEXT,
    "jobCostingQuantity" INTEGER,
    "jobTaskId" INTEGER,

    CONSTRAINT "JobTaskJobType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTask" (
    "id" SERIAL NOT NULL,
    "status" INTEGER DEFAULT 0,
    "employeeType" BOOLEAN DEFAULT false,
    "technicianId" INTEGER,
    "contractorId" INTEGER,
    "contractorCommissionTierId" INTEGER,
    "comment" TEXT,
    "paid" BOOLEAN DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "jobId" INTEGER,

    CONSTRAINT "JobTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTrack" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" INTEGER,

    CONSTRAINT "JobTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobImage" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" INTEGER,

    CONSTRAINT "JobImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTechnicianImage" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT,
    "uploadedById" INTEGER NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" INTEGER,

    CONSTRAINT "JobTechnicianImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "scheduleTimeAMPM" INTEGER DEFAULT 0,
    "scheduleDate" TIMESTAMP(3),
    "scheduledStartTime" TIMESTAMP(3),
    "scheduledEndTime" TIMESTAMP(3),
    "jobId" TEXT,
    "parentJobId" INTEGER,
    "ticketId" INTEGER,
    "requestId" INTEGER,
    "equipmentId" INTEGER,
    "technicianId" INTEGER,
    "contractorId" INTEGER,
    "customerId" INTEGER,
    "jobLocationId" INTEGER,
    "jobSiteId" INTEGER,
    "isHomeOccupied" BOOLEAN DEFAULT false,
    "homeOwnerId" INTEGER,
    "homeJobLocationId" INTEGER,
    "homeJobSiteId" INTEGER,
    "customerContactId" INTEGER,
    "customerPO" TEXT,
    "image" TEXT,
    "typeId" INTEGER,
    "tasksBackup" JSONB,
    "companyId" INTEGER,
    "description" TEXT,
    "status" INTEGER DEFAULT 0,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,
    "updatedAt" TIMESTAMP(3),
    "employeeType" BOOLEAN DEFAULT false,
    "charges" INTEGER DEFAULT 0,
    "salesTaxId" INTEGER,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "timeSpent" INTEGER DEFAULT 0,
    "timeUpdatedById" INTEGER,
    "timeUpdatedAt" TIMESTAMP(3),
    "equipmentScanned" BOOLEAN DEFAULT false,
    "noOfEquimentScanned" INTEGER DEFAULT 0,
    "completeOnTime" BOOLEAN DEFAULT false,
    "commissionId" INTEGER,
    "workTypeId" INTEGER,
    "companyLocationId" INTEGER,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCharges" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "charges" INTEGER,
    "isFixed" BOOLEAN NOT NULL DEFAULT true,
    "jobTypeId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesTaxId" INTEGER NOT NULL,

    CONSTRAINT "JobCharges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCosting" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inactiveById" INTEGER,
    "inactiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobType" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "industryId" INTEGER,
    "createdBy" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "quickbookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "customerContactId" INTEGER NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "message" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readById" INTEGER,
    "readAt" TIMESTAMP(3),
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedById" INTEGER,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inactiveById" INTEGER,
    "inactiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleTax" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "state" TEXT,
    "companyId" INTEGER NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "session" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "alternativeId" TEXT NOT NULL,
    "id" SERIAL NOT NULL,
    "info" JSONB,
    "address" JSONB,
    "contact" JSONB,
    "supplierAdminId" INTEGER NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "info" JSONB NOT NULL,
    "images" JSONB NOT NULL,
    "jobLocationId" INTEGER NOT NULL,
    "jobSiteId" INTEGER NOT NULL,
    "note" TEXT,
    "address" TEXT,
    "customerId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAuth" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "resetPasswordToken" TEXT NOT NULL,
    "resetPasswordExpires" TIMESTAMP(3) NOT NULL,
    "socialId" TEXT NOT NULL,
    "connectorType" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "extraPermissions" JSONB NOT NULL,
    "agreed" BOOLEAN NOT NULL DEFAULT false,
    "canAccessAllLocations" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "alternativeId" TEXT,
    "accountType" INTEGER,
    "userAuthId" INTEGER,
    "profile" JSONB,
    "address" JSONB,
    "location" JSONB,
    "contact" JSONB,
    "permissions" JSONB,
    "emailPreferences" JSONB,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "commission" INTEGER,
    "firebaseTokens" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AdvancepaymentToWorktype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_AdvancepaymentToCompanyLocation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_AssignedvendorToCompanyLocation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_InvoiceToPaymentvendor" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_PaymentcustomerToWorktype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_AssignedEmployeeToWorktype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_AssignedEmployeeToCompanyLocation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CompanyToCustomer" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CompanyLocationToWorktype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CompanyLocationToPaymentcustomer" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_EmailScheduleToJob" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_JobToPaymentvendor" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "Advancepayment_paidAt_idx" ON "Advancepayment"("paidAt");

-- CreateIndex
CREATE INDEX "Advancepayment_isVoid_paidAt_idx" ON "Advancepayment"("isVoid", "paidAt");

-- CreateIndex
CREATE INDEX "Advancepayment_isVoid_appliedAt_idx" ON "Advancepayment"("isVoid", "appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Companyadmin_companyId_key" ON "Companyadmin"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Companyadmin_userId_key" ON "Companyadmin"("userId");

-- CreateIndex
CREATE INDEX "Invoice_customerPO_idx" ON "Invoice"("customerPO");

-- CreateIndex
CREATE INDEX "Invoice_vendorId_idx" ON "Invoice"("vendorId");

-- CreateIndex
CREATE INDEX "Invoice_customerContactId_idx" ON "Invoice"("customerContactId");

-- CreateIndex
CREATE INDEX "Invoice_isDraft_idx" ON "Invoice"("isDraft");

-- CreateIndex
CREATE INDEX "Invoice_issuedDate_isDraft_idx" ON "Invoice"("issuedDate", "isDraft");

-- CreateIndex
CREATE INDEX "Invoice_isVoid_idx" ON "Invoice"("isVoid");

-- CreateIndex
CREATE INDEX "Invoice_quickbookId_isDraft_isVoid_idx" ON "Invoice"("quickbookId", "isDraft", "isVoid");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_id_isDraft_isVoid_idx" ON "Invoice"("createdAt", "id", "isDraft", "isVoid");

-- CreateIndex
CREATE INDEX "Invoice_issuedDate_note_vendorId_invoiceId_idx" ON "Invoice"("issuedDate", "note", "vendorId", "invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_isDraft_isVoid_invoiceId_customerPO_vendo_idx" ON "Invoice"("createdAt", "isDraft", "isVoid", "invoiceId", "customerPO", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoicecommission_invoiceId_key" ON "Invoicecommission"("invoiceId");

-- CreateIndex
CREATE INDEX "Joblocation_contacts_idx" ON "Joblocation"("contacts");

-- CreateIndex
CREATE INDEX "Joblocation_isActive_idx" ON "Joblocation"("isActive");

-- CreateIndex
CREATE INDEX "Joblocation_address_idx" ON "Joblocation"("address");

-- CreateIndex
CREATE INDEX "Joblocation_id_isActive_idx" ON "Joblocation"("id", "isActive");

-- CreateIndex
CREATE INDEX "Joblocation_quickbookId_idx" ON "Joblocation"("quickbookId");

-- CreateIndex
CREATE INDEX "Joblocation_name_address_location_idx" ON "Joblocation"("name", "address", "location");

-- CreateIndex
CREATE INDEX "Jobrequest_status_idx" ON "Jobrequest"("status");

-- CreateIndex
CREATE INDEX "Jobsite_isActive_idx" ON "Jobsite"("isActive");

-- CreateIndex
CREATE INDEX "Jobsite_id_isActive_idx" ON "Jobsite"("id", "isActive");

-- CreateIndex
CREATE INDEX "Jobsite_address_idx" ON "Jobsite"("address");

-- CreateIndex
CREATE INDEX "Payment_quickbookId_idx" ON "Payment"("quickbookId");

-- CreateIndex
CREATE INDEX "Payment_quickbookId_isVoid_idx" ON "Payment"("quickbookId", "isVoid");

-- CreateIndex
CREATE INDEX "Payment_paidAt_isVoid_idx" ON "Payment"("paidAt", "isVoid");

-- CreateIndex
CREATE INDEX "Payment_quickbookId_referenceNumber_paymentType_isVoid_idx" ON "Payment"("quickbookId", "referenceNumber", "paymentType", "isVoid");

-- CreateIndex
CREATE INDEX "Payment_quickbookId_referenceNumber_paymentType_isVoid_line_idx" ON "Payment"("quickbookId", "referenceNumber", "paymentType", "isVoid", "line");

-- CreateIndex
CREATE INDEX "Paymentemployee_invoices_idx" ON "Paymentemployee"("invoices");

-- CreateIndex
CREATE INDEX "Servicetickets_itemId_idx" ON "Servicetickets"("itemId");

-- CreateIndex
CREATE INDEX "Servicetickets_jobCreated_status_idx" ON "Servicetickets"("jobCreated", "status");

-- CreateIndex
CREATE INDEX "Servicetickets_jobCreated_status_type_idx" ON "Servicetickets"("jobCreated", "status", "type");

-- CreateIndex
CREATE INDEX "Servicetickets_id_idx" ON "Servicetickets"("id");

-- CreateIndex
CREATE UNIQUE INDEX "AssignedEmployee_alternativeId_key" ON "AssignedEmployee"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "BouncedEmail_alternativeId_key" ON "BouncedEmail"("alternativeId");

-- CreateIndex
CREATE INDEX "BouncedEmail_email_idx" ON "BouncedEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionHistory_alternativeId_key" ON "CommissionHistory"("alternativeId");

-- CreateIndex
CREATE INDEX "CommissionHistory_effectiveDate_idx" ON "CommissionHistory"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInfo_industryId_key" ON "CompanyInfo"("industryId");

-- CreateIndex
CREATE INDEX "CompanyInfo_companyEmail_idx" ON "CompanyInfo"("companyEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Company_alternativeId_key" ON "Company"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyInfoId_key" ON "Company"("companyInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyBlockchainId_key" ON "Company"("companyBlockchainId");

-- CreateIndex
CREATE INDEX "Company_plan_chargeDate_idx" ON "Company"("plan", "chargeDate");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCard_alternativeId_key" ON "CompanyCard"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCard_companyId_key" ON "CompanyCard"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyLocation_alternativeId_key" ON "CompanyLocation"("alternativeId");

-- CreateIndex
CREATE INDEX "CompanyLocation_companyId_isActive_isMainLocation_idx" ON "CompanyLocation"("companyId", "isActive", "isMainLocation");

-- CreateIndex
CREATE INDEX "CompanyLocation_companyId_isActive_isMainLocation_id_idx" ON "CompanyLocation"("companyId", "isActive", "isMainLocation", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDefault_alternativeId_key" ON "EmailDefault"("alternativeId");

-- CreateIndex
CREATE INDEX "EmailDefault_companyId_emailType_idx" ON "EmailDefault"("companyId", "emailType");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSchedule_alternativeId_key" ON "EmailSchedule"("alternativeId");

-- CreateIndex
CREATE INDEX "EmailSchedule_pulled_idx" ON "EmailSchedule"("pulled");

-- CreateIndex
CREATE UNIQUE INDEX "HomeOwners_subdivisionId_key" ON "HomeOwners"("subdivisionId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeOwners_addressId_key" ON "HomeOwners"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "Industry_alternativeId_key" ON "Industry"("alternativeId");

-- CreateIndex
CREATE INDEX "Industry_title_idx" ON "Industry"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Job_alternativeId_key" ON "Job"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_parentJobId_key" ON "Job"("parentJobId");

-- CreateIndex
CREATE INDEX "Job_employeeType_idx" ON "Job"("employeeType");

-- CreateIndex
CREATE INDEX "Job_image_idx" ON "Job"("image");

-- CreateIndex
CREATE UNIQUE INDEX "JobCharges_alternativeId_key" ON "JobCharges"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCosting_alternativeId_key" ON "JobCosting"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "JobType_alternativeId_key" ON "JobType"("alternativeId");

-- CreateIndex
CREATE INDEX "JobType_title_idx" ON "JobType" USING SPGIST ("title");

-- CreateIndex
CREATE INDEX "JobType_createdBy_quickbookId_idx" ON "JobType"("createdBy", "quickbookId");

-- CreateIndex
CREATE INDEX "JobType_title_industryId_createdBy_idx" ON "JobType"("title", "industryId", "createdBy");

-- CreateIndex
CREATE INDEX "JobType_createdBy_industryId_isActive_idx" ON "JobType"("createdBy", "industryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PriceTier_alternativeId_key" ON "PriceTier"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleTax_alternativeId_key" ON "SaleTax"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_alternativeId_key" ON "Session"("alternativeId");

-- CreateIndex
CREATE INDEX "Session_session_idx" ON "Session"("session");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuth_email_key" ON "UserAuth"("email");

-- CreateIndex
CREATE INDEX "UserAuth_email_idx" ON "UserAuth"("email");

-- CreateIndex
CREATE INDEX "UserAuth_socialId_connectorType_idx" ON "UserAuth"("socialId", "connectorType");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_alternativeId_key" ON "User"("alternativeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_userAuthId_key" ON "User"("userAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "_AdvancepaymentToWorktype_AB_unique" ON "_AdvancepaymentToWorktype"("A", "B");

-- CreateIndex
CREATE INDEX "_AdvancepaymentToWorktype_B_index" ON "_AdvancepaymentToWorktype"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AdvancepaymentToCompanyLocation_AB_unique" ON "_AdvancepaymentToCompanyLocation"("A", "B");

-- CreateIndex
CREATE INDEX "_AdvancepaymentToCompanyLocation_B_index" ON "_AdvancepaymentToCompanyLocation"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AssignedvendorToCompanyLocation_AB_unique" ON "_AssignedvendorToCompanyLocation"("A", "B");

-- CreateIndex
CREATE INDEX "_AssignedvendorToCompanyLocation_B_index" ON "_AssignedvendorToCompanyLocation"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_InvoiceToPaymentvendor_AB_unique" ON "_InvoiceToPaymentvendor"("A", "B");

-- CreateIndex
CREATE INDEX "_InvoiceToPaymentvendor_B_index" ON "_InvoiceToPaymentvendor"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PaymentcustomerToWorktype_AB_unique" ON "_PaymentcustomerToWorktype"("A", "B");

-- CreateIndex
CREATE INDEX "_PaymentcustomerToWorktype_B_index" ON "_PaymentcustomerToWorktype"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AssignedEmployeeToWorktype_AB_unique" ON "_AssignedEmployeeToWorktype"("A", "B");

-- CreateIndex
CREATE INDEX "_AssignedEmployeeToWorktype_B_index" ON "_AssignedEmployeeToWorktype"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AssignedEmployeeToCompanyLocation_AB_unique" ON "_AssignedEmployeeToCompanyLocation"("A", "B");

-- CreateIndex
CREATE INDEX "_AssignedEmployeeToCompanyLocation_B_index" ON "_AssignedEmployeeToCompanyLocation"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CompanyToCustomer_AB_unique" ON "_CompanyToCustomer"("A", "B");

-- CreateIndex
CREATE INDEX "_CompanyToCustomer_B_index" ON "_CompanyToCustomer"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CompanyLocationToWorktype_AB_unique" ON "_CompanyLocationToWorktype"("A", "B");

-- CreateIndex
CREATE INDEX "_CompanyLocationToWorktype_B_index" ON "_CompanyLocationToWorktype"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CompanyLocationToPaymentcustomer_AB_unique" ON "_CompanyLocationToPaymentcustomer"("A", "B");

-- CreateIndex
CREATE INDEX "_CompanyLocationToPaymentcustomer_B_index" ON "_CompanyLocationToPaymentcustomer"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EmailScheduleToJob_AB_unique" ON "_EmailScheduleToJob"("A", "B");

-- CreateIndex
CREATE INDEX "_EmailScheduleToJob_B_index" ON "_EmailScheduleToJob"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_JobToPaymentvendor_AB_unique" ON "_JobToPaymentvendor"("A", "B");

-- CreateIndex
CREATE INDEX "_JobToPaymentvendor_B_index" ON "_JobToPaymentvendor"("B");

-- AddForeignKey
ALTER TABLE "Advancepayment" ADD CONSTRAINT "Advancepayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepayment" ADD CONSTRAINT "Advancepayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepayment" ADD CONSTRAINT "Advancepayment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepayment" ADD CONSTRAINT "Advancepayment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepaymentvendor" ADD CONSTRAINT "Advancepaymentvendor_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancepaymentemployee" ADD CONSTRAINT "Advancepaymentemployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignedvendor" ADD CONSTRAINT "Assignedvendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_replyTo_fkey" FOREIGN KEY ("replyTo") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Companyadmin" ADD CONSTRAINT "Companyadmin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Companyadmin" ADD CONSTRAINT "Companyadmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplieradmin" ADD CONSTRAINT "Supplieradmin_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Companycustomer" ADD CONSTRAINT "Companycustomer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Companycustomer" ADD CONSTRAINT "Companycustomer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Companyinvoice" ADD CONSTRAINT "Companyinvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Companyprefix" ADD CONSTRAINT "Companyprefix_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_finishedById_fkey" FOREIGN KEY ("finishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "Paymentterm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobLocationId_fkey" FOREIGN KEY ("jobLocationId") REFERENCES "Joblocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobSiteId_fkey" FOREIGN KEY ("jobSiteId") REFERENCES "Jobsite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "Worktype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoicecommission" ADD CONSTRAINT "Invoicecommission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoiceprefix" ADD CONSTRAINT "Invoiceprefix_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joblocation" ADD CONSTRAINT "Joblocation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joblocation" ADD CONSTRAINT "Joblocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Joblocation" ADD CONSTRAINT "Joblocation_inactiveById_fkey" FOREIGN KEY ("inactiveById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_jobLocationId_fkey" FOREIGN KEY ("jobLocationId") REFERENCES "Joblocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_jobSiteId_fkey" FOREIGN KEY ("jobSiteId") REFERENCES "Jobsite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "Worktype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobrequest" ADD CONSTRAINT "Jobrequest_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobsite" ADD CONSTRAINT "Jobsite_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Joblocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jobsite" ADD CONSTRAINT "Jobsite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paymentterm" ADD CONSTRAINT "Paymentterm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paymentterm" ADD CONSTRAINT "Paymentterm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paymentcustomer" ADD CONSTRAINT "Paymentcustomer_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paymentvendor" ADD CONSTRAINT "Paymentvendor_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paymentemployee" ADD CONSTRAINT "Paymentemployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTicketTasks" ADD CONSTRAINT "ServiceTicketTasks_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Servicetickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTicketTasks" ADD CONSTRAINT "ServiceTicketTasks_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_jobLocationId_fkey" FOREIGN KEY ("jobLocationId") REFERENCES "Joblocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_jobSiteId_fkey" FOREIGN KEY ("jobSiteId") REFERENCES "Jobsite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_homeOwnerId_fkey" FOREIGN KEY ("homeOwnerId") REFERENCES "HomeOwners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_homeJobLocationId_fkey" FOREIGN KEY ("homeJobLocationId") REFERENCES "Joblocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_homeJobSiteId_fkey" FOREIGN KEY ("homeJobSiteId") REFERENCES "Jobsite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "Worktype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicetickets" ADD CONSTRAINT "Servicetickets_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionHistory" ADD CONSTRAINT "commissionHistory_technician_fkey" FOREIGN KEY ("technicianIdORContractorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionHistory" ADD CONSTRAINT "commissionHistory_contractor_fkey" FOREIGN KEY ("technicianIdORContractorId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionHistory" ADD CONSTRAINT "CommissionHistory_editedUserId_fkey" FOREIGN KEY ("editedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionHistory" ADD CONSTRAINT "CommissionHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInfo" ADD CONSTRAINT "CompanyInfo_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBlockchain" ADD CONSTRAINT "CompanyBlockchain_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBlockchain" ADD CONSTRAINT "CompanyBlockchain_deniedById_fkey" FOREIGN KEY ("deniedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_companyInfoId_fkey" FOREIGN KEY ("companyInfoId") REFERENCES "CompanyInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Companyadmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "Paymentterm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_companyBlockchainId_fkey" FOREIGN KEY ("companyBlockchainId") REFERENCES "CompanyBlockchain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCard" ADD CONSTRAINT "CompanyCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_itemTierId_fkey" FOREIGN KEY ("itemTierId") REFERENCES "PriceTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_jobCostingId_fkey" FOREIGN KEY ("jobCostingId") REFERENCES "JobCosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "Paymentterm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_inactiveById_fkey" FOREIGN KEY ("inactiveById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDefault" ADD CONSTRAINT "EmailDefault_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDefault" ADD CONSTRAINT "EmailDefault_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSchedule" ADD CONSTRAINT "EmailSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeOwners" ADD CONSTRAINT "HomeOwners_subdivisionId_fkey" FOREIGN KEY ("subdivisionId") REFERENCES "Joblocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeOwners" ADD CONSTRAINT "HomeOwners_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Jobsite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Industry" ADD CONSTRAINT "Industry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTier" ADD CONSTRAINT "ItemTier_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "PriceTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTier" ADD CONSTRAINT "ItemTier_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTier" ADD CONSTRAINT "ItemTier_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCosting" ADD CONSTRAINT "ItemCosting_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "JobCosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCosting" ADD CONSTRAINT "ItemCosting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCosting" ADD CONSTRAINT "ItemCosting_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Items" ADD CONSTRAINT "Items_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Items" ADD CONSTRAINT "Items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTaskJobType" ADD CONSTRAINT "JobTaskJobType_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTaskJobType" ADD CONSTRAINT "JobTaskJobType_timeUpdatedById_fkey" FOREIGN KEY ("timeUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTaskJobType" ADD CONSTRAINT "JobTaskJobType_jobTaskId_fkey" FOREIGN KEY ("jobTaskId") REFERENCES "JobTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTask" ADD CONSTRAINT "JobTask_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTask" ADD CONSTRAINT "JobTask_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTask" ADD CONSTRAINT "JobTask_contractorCommissionTierId_fkey" FOREIGN KEY ("contractorCommissionTierId") REFERENCES "JobCosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTask" ADD CONSTRAINT "JobTask_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTrack" ADD CONSTRAINT "JobTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTrack" ADD CONSTRAINT "JobTrack_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobImage" ADD CONSTRAINT "JobImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobImage" ADD CONSTRAINT "JobImage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTechnicianImage" ADD CONSTRAINT "JobTechnicianImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTechnicianImage" ADD CONSTRAINT "JobTechnicianImage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_parentJobId_fkey" FOREIGN KEY ("parentJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Servicetickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Jobrequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobLocationId_fkey" FOREIGN KEY ("jobLocationId") REFERENCES "Joblocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobSiteId_fkey" FOREIGN KEY ("jobSiteId") REFERENCES "Jobsite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_homeOwnerId_fkey" FOREIGN KEY ("homeOwnerId") REFERENCES "HomeOwners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_homeJobLocationId_fkey" FOREIGN KEY ("homeJobLocationId") REFERENCES "Joblocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_homeJobSiteId_fkey" FOREIGN KEY ("homeJobSiteId") REFERENCES "Jobsite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "JobType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_salesTaxId_fkey" FOREIGN KEY ("salesTaxId") REFERENCES "SaleTax"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_timeUpdatedById_fkey" FOREIGN KEY ("timeUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "Worktype"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCharges" ADD CONSTRAINT "JobCharges_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCharges" ADD CONSTRAINT "JobCharges_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCharges" ADD CONSTRAINT "JobCharges_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCharges" ADD CONSTRAINT "JobCharges_salesTaxId_fkey" FOREIGN KEY ("salesTaxId") REFERENCES "SaleTax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCosting" ADD CONSTRAINT "JobCosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCosting" ADD CONSTRAINT "JobCosting_inactiveById_fkey" FOREIGN KEY ("inactiveById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobType" ADD CONSTRAINT "JobType_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobType" ADD CONSTRAINT "JobType_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_readById_fkey" FOREIGN KEY ("readById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_dismissedById_fkey" FOREIGN KEY ("dismissedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_inactiveById_fkey" FOREIGN KEY ("inactiveById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTax" ADD CONSTRAINT "SaleTax_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTax" ADD CONSTRAINT "SaleTax_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_jobLocationId_fkey" FOREIGN KEY ("jobLocationId") REFERENCES "Joblocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_jobSiteId_fkey" FOREIGN KEY ("jobSiteId") REFERENCES "Jobsite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_userAuthId_fkey" FOREIGN KEY ("userAuthId") REFERENCES "UserAuth"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvancepaymentToWorktype" ADD CONSTRAINT "_AdvancepaymentToWorktype_A_fkey" FOREIGN KEY ("A") REFERENCES "Advancepayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvancepaymentToWorktype" ADD CONSTRAINT "_AdvancepaymentToWorktype_B_fkey" FOREIGN KEY ("B") REFERENCES "Worktype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvancepaymentToCompanyLocation" ADD CONSTRAINT "_AdvancepaymentToCompanyLocation_A_fkey" FOREIGN KEY ("A") REFERENCES "Advancepayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvancepaymentToCompanyLocation" ADD CONSTRAINT "_AdvancepaymentToCompanyLocation_B_fkey" FOREIGN KEY ("B") REFERENCES "CompanyLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedvendorToCompanyLocation" ADD CONSTRAINT "_AssignedvendorToCompanyLocation_A_fkey" FOREIGN KEY ("A") REFERENCES "Assignedvendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedvendorToCompanyLocation" ADD CONSTRAINT "_AssignedvendorToCompanyLocation_B_fkey" FOREIGN KEY ("B") REFERENCES "CompanyLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvoiceToPaymentvendor" ADD CONSTRAINT "_InvoiceToPaymentvendor_A_fkey" FOREIGN KEY ("A") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvoiceToPaymentvendor" ADD CONSTRAINT "_InvoiceToPaymentvendor_B_fkey" FOREIGN KEY ("B") REFERENCES "Paymentvendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentcustomerToWorktype" ADD CONSTRAINT "_PaymentcustomerToWorktype_A_fkey" FOREIGN KEY ("A") REFERENCES "Paymentcustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentcustomerToWorktype" ADD CONSTRAINT "_PaymentcustomerToWorktype_B_fkey" FOREIGN KEY ("B") REFERENCES "Worktype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedEmployeeToWorktype" ADD CONSTRAINT "_AssignedEmployeeToWorktype_A_fkey" FOREIGN KEY ("A") REFERENCES "AssignedEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedEmployeeToWorktype" ADD CONSTRAINT "_AssignedEmployeeToWorktype_B_fkey" FOREIGN KEY ("B") REFERENCES "Worktype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedEmployeeToCompanyLocation" ADD CONSTRAINT "_AssignedEmployeeToCompanyLocation_A_fkey" FOREIGN KEY ("A") REFERENCES "AssignedEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedEmployeeToCompanyLocation" ADD CONSTRAINT "_AssignedEmployeeToCompanyLocation_B_fkey" FOREIGN KEY ("B") REFERENCES "CompanyLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToCustomer" ADD CONSTRAINT "_CompanyToCustomer_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToCustomer" ADD CONSTRAINT "_CompanyToCustomer_B_fkey" FOREIGN KEY ("B") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyLocationToWorktype" ADD CONSTRAINT "_CompanyLocationToWorktype_A_fkey" FOREIGN KEY ("A") REFERENCES "CompanyLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyLocationToWorktype" ADD CONSTRAINT "_CompanyLocationToWorktype_B_fkey" FOREIGN KEY ("B") REFERENCES "Worktype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyLocationToPaymentcustomer" ADD CONSTRAINT "_CompanyLocationToPaymentcustomer_A_fkey" FOREIGN KEY ("A") REFERENCES "CompanyLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyLocationToPaymentcustomer" ADD CONSTRAINT "_CompanyLocationToPaymentcustomer_B_fkey" FOREIGN KEY ("B") REFERENCES "Paymentcustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmailScheduleToJob" ADD CONSTRAINT "_EmailScheduleToJob_A_fkey" FOREIGN KEY ("A") REFERENCES "EmailSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmailScheduleToJob" ADD CONSTRAINT "_EmailScheduleToJob_B_fkey" FOREIGN KEY ("B") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobToPaymentvendor" ADD CONSTRAINT "_JobToPaymentvendor_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobToPaymentvendor" ADD CONSTRAINT "_JobToPaymentvendor_B_fkey" FOREIGN KEY ("B") REFERENCES "Paymentvendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
