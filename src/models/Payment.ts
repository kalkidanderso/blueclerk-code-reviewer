import mongoose, { Document, Schema } from 'mongoose'

export interface IPayment extends Document {
    customer: Schema.Types.ObjectId
    invoices: [Schema.Types.ObjectId]
    amountPaid: number
    referenceNumber: string
    paymentType: string
    paidAt: Date
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date
    updatedBy: Schema.Types.ObjectId
    updatedAt: Date
}

const PaymentSchema = new Schema({
    
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    invoices: [{type: Schema.Types.ObjectId, ref: 'Invoice'}],
    amountPaid:{
        type : Number,
        default: 0
    },
    referenceNumber: {
        type: String,
        required: false
    },
    paymentType: {
        type: String,
        required: false
    },
    paidAt: {
        type: Date
    },
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
    createdAt: {
        type: Date
    },
    udpatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedAt: {
        type: Date
    }
})

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema)