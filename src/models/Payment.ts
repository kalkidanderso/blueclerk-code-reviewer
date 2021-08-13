import mongoose, { Document, Schema } from 'mongoose'
import { PaymentTypes } from '../common/constants';

import { ICompany } from '../models/Company';
import { IUser } from '../models/User';
import { ICustomer } from '../models/Customer';
import { IInvoice } from '../models/Invoice';

export interface IPayment extends Document {
    customer: Schema.Types.ObjectId | ICustomer
    invoice: Schema.Types.ObjectId | IInvoice
    // invoices: [Schema.Types.ObjectId]
    amountPaid: number
    referenceNumber: string
    paymentType: PaymentTypes
    paidAt: Date
    company: Schema.Types.ObjectId | ICompany
    quickbookId?: string
    createdBy: Schema.Types.ObjectId | IUser
    createdAt: Date
    updatedBy: Schema.Types.ObjectId | IUser
    updatedAt: Date
}

export interface IQBPayment {
    Id?: string
    TxnDate?: Date
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
    }[]
    TotalAmt: number
    UnappliedAmt?: number
    PaymentRefNum?: string
    PaymentMethodRef?: {
        value: string
        name?: string
    }
    PrivateNote?: string
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
    
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    invoice: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    // invoices: [{type: Schema.Types.ObjectId, ref: 'Invoice'}],
    amountPaid:{
        type : Number,
        default: 0
    },
    referenceNumber: String,
    paymentType: {
        type: String,
        enum: Object.values(PaymentTypes),
        required: true
    },
    paidAt: Date,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    quickbookId: String,
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
    updatedAt: Date
})

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema)