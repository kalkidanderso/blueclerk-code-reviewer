//  here we have created all interfaces related to Advance payment 
export interface IAdvancePayment {
    id?: number;
    alternativeId?: string;
    type?: string;
    companyId?: number;
    company?: number;
    amount?: number;
    balance?: number;
    referenceNumber?: string;
    paymentType?: string;
    paidAt?: Date;
    appliedAt?: Date;
    note?: string;
    isVoid?: boolean;
    voidedAt?: Date;
    createdByUser?: number;
    updatedByUser?: number;
    voidedByUser?:number;
    workType?: number[];
    companyLocation?: number[];
    startDate?: string;
    endDate?: string;
    isActive?: string;
    offset?: string;
}

export interface ICreateAdvancePaymentInput {
    company: number;
    referenceNumber: string;
    paidAt?: Date;
    appliedAt?: Date;
    amount: number;
    balance: number;
    paymentType: string;
    note?: string;
    createdByUser: number;
    updatedByUser: number;
    voidedByUser:number;
    workType?: number[];
    companyLocation?: number[];
}

export interface ICreateAdvancePaymentRequestBody {
    id: number;
    type: string;
    amount: number;
    balance: number;
    referenceNumber: string;
    paymentType: string;
    paidAt?: Date;
    appliedAt?: Date;
    note?: string;
    createdByUser: number;
    updatedByUser: number;
    voidedByUser:number;
    workType?: number[];
    companyLocation?: number[];
}

export interface IUpdateAdvancePaymentInput {
    id: number;
    alternativeId: string;
    type: string;
    company: number;
    amount: number;
    balance?: number;
    referenceNumber?: string;
    paymentType: string;
    paidAt?: Date;
    appliedAt?: Date;
    note?: string;
    isVoid?: boolean;
    voidedAt?: Date;
    createdByUser: number;
    updatedByUser: number;
    voidedByUser:number;
    workType?: number[];
    companyLocation?: number[];
    advancePaymentId: number;
}

export interface IVoidAdvancePaymentInput {
    type: string;
    advancePaymentId: number;
}
