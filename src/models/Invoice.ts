import mongoose, { Document, Schema } from 'mongoose'

export interface IInvoice extends Document {
    invoiceId: string
    invoiceType: number
    job: Schema.Types.ObjectId
    purchaseOrder: Schema.Types.ObjectId
    jobPurchaseOrders: [Schema.Types.ObjectId]
    customer: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    charges: number
    note : String
    total: number
    tax: number
    taxPercentage: number
    createdBy: Schema.Types.ObjectId
    createdAt: Date,
    timeSpent: number
    isFixed: boolean
    hourlyRate: number
}

const InvoiceSchema = new Schema({

    invoiceId: String,
    // 0 for job invoice
    // 1 for PO invoice
    invoiceType: {
        type: Number,
        default: 0
    },
    job: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: false
    },
    purchaseOrder :{
        type: Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: false
    },
    jobPurchaseOrders :[{
        type: Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: false
    }],
    note: {
        type: String,
        required: false
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
        type: Number,
        default: 0
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
    },
    timeSpent: {
        type: Number,
        default: 0
    },
    isFixed: {
        type: Boolean,
        default: false
    },    
    hourlyRate: {
        type: Number,
        default: 0
    },
})

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema)