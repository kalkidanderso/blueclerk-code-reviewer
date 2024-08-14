export interface InvoiceRequestBody {
    invoiceId: string;
    dueDate: string;
    startAmount: number;
    endAmount: number;
    customerPO: string;
    missingPO: any,
    customerId: string;
    customerContactId: string;
    isDraft: boolean;
    isVoid: boolean,
    startDate: Date;
    endDate: Date;
    lastEmailStartDate: Date;
    lastEmailEndDate: Date;
    bouncedEmailFlag: boolean
}

export interface InvoiceRequestQuery { }