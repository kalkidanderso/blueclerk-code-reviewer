import mongoose, { Document, Schema } from 'mongoose'

export interface IInvoicePrefix extends Document {

    prefix: string
    maxInvoiceId: number
    company: Schema.Types.ObjectId
}

const InvoicePrefixSchema = new Schema({

    prefix: String,
    maxInvoiceId: Number,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
})

export const InvoicePrefix = mongoose.model<IInvoicePrefix>('InvoicePrefix', InvoicePrefixSchema)