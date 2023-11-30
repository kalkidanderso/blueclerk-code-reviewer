export interface ICreateJobReportsInput {
    jobId: number; 
    scanIds?: number[]; 
    customerName?: string;
    technicianName?: string;
    jobDate?: Date;
    purchaseOrderIds?: number[]; 
    companyId: number; 
    contractorId: number; 
    emailHistory?: {
        sentTo: string;
        sentAt: Date;
    }[]; 
    lastEmailSent?: Date;
    createdAt?: Date;
    invoiceCreated?: boolean;
    invoiceVoid?: boolean;
    invoiceId?: number; 
}

export interface IFilterJobReportsInput {
    jobId?: number;
    scanId?: number;
    customerName?: string;
    technicianName?: string;
    jobDateFrom?: Date; 
    jobDateTo?: Date; 
    purchaseOrderId?: number;
    companyId?: number;
    contractorId?: number;
    lastEmailSentFrom?: Date; 
    lastEmailSentTo?: Date; 
    invoiceCreated?: boolean;
    invoiceVoid?: boolean;
}
