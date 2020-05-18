import mongoose, { Document, Schema } from 'mongoose'

export interface IInvoice extends Document {

    invoiceId: string
    job: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    charges: number
    total: number
    tax: number
    taxPercentage: number
    createdBy: Schema.Types.ObjectId
    createdAt: Date
}

const InvoiceSchema = new Schema({

    invoiceId: String,
    job: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    charges:{
        type: Number
    },
    total: {
        type: Number
    },
    tax: {
        type: Number,
        default: 0
    },
    taxPercentage: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }

})

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema)