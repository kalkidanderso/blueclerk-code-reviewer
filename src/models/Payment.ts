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
    createdBy: Schema.Types.ObjectId | IUser
    createdAt: Date
    updatedBy: Schema.Types.ObjectId | IUser
    updatedAt: Date
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