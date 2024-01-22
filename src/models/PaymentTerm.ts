import mongoose, { Document, Schema } from 'mongoose';
import { PaymentTermNames } from '../common/constants';
import { ICompany } from '../models/Company';
import { IUser } from '../models/User';

export interface IPaymentTerm extends Document {

    name: PaymentTermNames | string
    dueDays: number
    isActive?: boolean
    company: Schema.Types.ObjectId | ICompany
    quickbookId: string
    createdBy?: Schema.Types.ObjectId | IUser
    createdAt?: Date
    updatedAt?: Date
    deleted?: boolean
    deletedAt?: Date

}

export const DefaultPaymentTerms = [
    {
        name: PaymentTermNames.DUE_ON_RECEIPT,
        dueDays: 0
    },
    {
        name: PaymentTermNames.NET_15,
        dueDays: 15
    },
    {
        name: PaymentTermNames.NET_30,
        dueDays: 30
    }
];

export interface IQBPaymentTerm {

    Id?: string
    Name: string
    Active: boolean
    DueDays: number
    Type?: 'STANDARD' | 'DATE_DRIVEN'
    DiscountPercent?: number
    DiscountDays?: number

}

const PaymentTermSchema = new Schema(

    {
        name: {
            type: String,
            required: true
        },
        dueDays: {
            type: Number,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
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
        deleteAt: Date
    },
    { timestamps: { createdAt: true, updatedAt: true } }

);

//Indexes
PaymentTermSchema.index({ company: 1 });
PaymentTermSchema.index({ createdBy: 1 });
PaymentTermSchema.index({ isActive: 1 });
PaymentTermSchema.index({ company: 1, isActive: 1 });
PaymentTermSchema.index({ company: 1, quickbookId: 1 });

export const PaymentTerm = mongoose.model<IPaymentTerm>('PaymentTerm', PaymentTermSchema);
