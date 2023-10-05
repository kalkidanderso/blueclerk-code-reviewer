export interface IAdvancePayment {
    id: number;
    alternativeId: string;
    companyId: number;
    amount: number;
    balance: number;
    referenceNumber: string;
    paymentType: string;
    paidAt: Date;
    appliedAt: Date;
    note?: string;
    isVoid: boolean;
    voidedAt: Date;
    createdById: number;
    updatedById: number;
    voidedById:number;
    workTypeId: number;
    companyLocationId: number; 
    contractorId: number;
    employeeId:number;
}

export interface ICreateAdvancePaymentInput {
    id: number;
    type: string;
    amount: number;
    referenceNumber: string;
    paymentType: string;
    paidAt: Date;
    appliedAt: Date;
    note?: string;
    workType: number[];
    companyLocation: number[];
    contractorId: number;
    employeeId:number;
}