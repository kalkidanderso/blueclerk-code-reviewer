export interface ICreateJobReportsInput {
    jobId: number; 
    scanIds?: number[]; 
    customerName?: string;
    technicianName?: string;
    jobDate?: Date;
    purchaseOrderIds?: number[]; 
    company?: string;
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

export interface IJobReportsQueryParams {
    keyword?: string;
    startDate?: Date;
    endDate?: Date;
    currentPage?: number;
    pageSize?: number;
}