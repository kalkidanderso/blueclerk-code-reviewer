import mongoose, { Document, Schema } from 'mongoose';
import { PaymentTypes } from '../common/constants';

import { ICompany } from '../models/Company';
import { IUser } from '../models/User';
import { ICustomer } from '../models/Customer';
import { IInvoice } from '../models/Invoice';
import { IWorkType } from './WorkType';
import { ICompanyLocation } from './CompanyLocation';
import { IJob } from './Job';

export interface IPayment extends Document {
    customer: Schema.Types.ObjectId | ICustomer
    invoice: Schema.Types.ObjectId | IInvoice
    invoices: [Schema.Types.ObjectId | IInvoice]
    jobs: [Schema.Types.ObjectId | IJob]
    line: [{
        invoice: Schema.Types.ObjectId | IInvoice
        amountPaid: number
    }]
    contractor: Schema.Types.ObjectId | ICompany
    employee: Schema.Types.ObjectId | ICustomer
    amountPaid: number
    referenceNumber: string
    paymentType?: PaymentTypes | string
    paidAt: Date
    dueDate: Date
    note?: string
    isVoid: boolean
    voidedAt: Date
    company: Schema.Types.ObjectId | ICompany
    quickbookRefNum?: string
    quickbookId?: string
    createdBy: Schema.Types.ObjectId | IUser
    createdAt: Date
    updatedBy: Schema.Types.ObjectId | IUser
    updatedAt: Date
    workType: [Schema.Types.ObjectId | IWorkType]
    companyLocation: [Schema.Types.ObjectId | ICompanyLocation]
}

export interface IPaymentCustomer extends IPayment {

    customer: Schema.Types.ObjectId | ICustomer
    invoice: Schema.Types.ObjectId | IInvoice
    workType: [Schema.Types.ObjectId | IWorkType]
    companyLocation: [Schema.Types.ObjectId | ICompanyLocation]
}

export interface IPaymentVendor extends IPayment {

    contractor: Schema.Types.ObjectId | ICompany
    invoices: [Schema.Types.ObjectId | IInvoice]
    jobs: [Schema.Types.ObjectId | IJob]
    startDate: Date
    endDate: Date
    offset: number
    creditUsed: number
}

export interface IJobExportQuery { 
    company: any; 
    status: number; 
    endTime: { $gte: any; $lte: any; }; 
    commission: { $ne: any; }; 
    companyLocation?: any;
    workType?: any
}

export interface IPaymentEmployee extends IPayment {

    employee: Schema.Types.ObjectId | ICustomer
    invoices: [Schema.Types.ObjectId | IInvoice]
    startDate: Date
    endDate: Date
    offset: number
    creditUsed: number
}

export interface IQBPayment {
    Id?: string
    TxnDate?: string
    CustomerRef: {
        value: string
        name?: string
    }
    Line: {
        Amount: number
        LinkedTxn: {
            TxnId: string
            TxnType: IQBPaymentTxnTypes
            TxnLineId?: string
        }[]
        LineEx?: {
            any?: {
                name?: string
                declaredType?: string
                scope?: string
                value?: {
                    Name?: string
                    Value?: string
                }
                nil?: boolean
                globalScope?: boolean
                typeSubstituted?: boolean
            }[]
        }
    }[]
    TotalAmt: number
    UnappliedAmt?: number
    PaymentRefNum?: string
    PaymentMethodRef?: {
        value: string
        name?: string
    }
    PrivateNote?: string
    MetaData?: {
        CreateTime?: string
        LastUpdatedTime?: string
    },
    SyncToken?: string
    CurrencyRef?: {
        value?: string
        name?: string
    }
    LinkedTxn?: {
        TxnId?: string
        TxnType?: string
    }[]
    status?: string
}

export interface IQBPaymentMethod {
    Id?: string
    Name: string
    Type: 'CREDIT_CARD' | 'NON_CREDIT_CARD'
    Active?: boolean
}

export enum IQBPaymentTxnTypes {
    EXPENSE = 'Expense',
    CHECK = 'Check',
    CREDIT_CARD_CREDIT = 'CreditCardCredit',
    JOURNAL_ENTRY = 'JournalEntry',
    CREDIT_MEMO = 'CreditMemo',
    INVOICE = 'Invoice'
}

const PaymentSchema = new Schema({

    amountPaid: {
        type: Number,
        default: 0
    },
    referenceNumber: String,
    paymentType: String,
    line: [{
        invoice: {
            type: Schema.Types.ObjectId,
            ref: 'Invoice'
        },
        amountPaid: {
            type: Number,
            default: 0
        }
    }],
    paidAt: Date,
    isVoid: {
        type: Boolean,
        default: false
    },
    voidedAt: Date,
    note: String,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    quickbookId: String,
    quickbookRefNum: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: Date,
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    workType: [{
        type: Schema.Types.ObjectId,
        ref: 'WorkType',
    }],
    companyLocation: [{
        type: Schema.Types.ObjectId,
        ref: 'CompanyLocation',
    }],
    updatedAt: Date,
});

const PaymentCustomerSchema = new Schema({

    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    invoice: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        required: false
    },
    workType: [{
        type: Schema.Types.ObjectId,
        ref: 'WorkType',
    }],
    companyLocation: [{
        type: Schema.Types.ObjectId,
        ref: 'CompanyLocation',
    }],
});

const PaymentVendorSchema = new Schema({

    contractor: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
    },
    invoices: [{
        type: Schema.Types.ObjectId,
        ref: 'Invoice'
    }],
    jobs: [{
        type: Schema.Types.ObjectId,
        ref: 'Jobs'
    }],
    startDate: Date,
    endDate: Date,
    offset: Number,
    creditUsed: {
        type: Number,
        default: 0
    }
});


const PaymentEmployeeSchema = new Schema({
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    invoices: [{
        type: Schema.Types.ObjectId,
        ref: 'Invoice'
    }],
    startDate: Date,
    endDate: Date,
    offset: Number,
    creditUsed: {
        type: Number,
        default: 0
    }
});

//Indexes
PaymentSchema.index({ company: 1 });
PaymentSchema.index({ createdBy: 1 });
PaymentSchema.index({ updatedBy: 1 });
PaymentCustomerSchema.index({ customer: 1 });
PaymentCustomerSchema.index({ invoice: 1 });
PaymentVendorSchema.index({ contractor: 1 });
PaymentVendorSchema.index({ invoices: 1 });
PaymentEmployeeSchema.index({ employee: 1 });
PaymentEmployeeSchema.index({ invoices: 1 });
PaymentSchema.index({ company: 1, quickbookId: 1 });
PaymentSchema.index({ company: 1, quickbookId: 1, isVoid: 1 });
PaymentSchema.index({ company: 1, contractor: 1,  paidAt: 1, isVoid: 1});
PaymentSchema.index({ company: 1, employee: 1,  paidAt: 1, isVoid: 1});
PaymentSchema.index({ company: 1, quickbookId: 1, referenceNumber: 1, paymentType: 1, isVoid: 1});
PaymentSchema.index({ company: 1, quickbookId: 1, referenceNumber: 1, paymentType: 1, line: 1, isVoid: 1});

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export const PaymentCustomer = Payment.discriminator<IPaymentCustomer>('PaymentCustomer', PaymentCustomerSchema);
export const PaymentVendor = Payment.discriminator<IPaymentVendor>('PaymentVendor', PaymentVendorSchema);
export const PaymentEmployee = Payment.discriminator<IPaymentEmployee>('PaymentEmployee', PaymentEmployeeSchema);