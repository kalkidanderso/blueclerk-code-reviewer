import mongoose, { Document, Schema } from 'mongoose'

export interface IInvoice extends Document {
    invoice: any[]
    invoiceId: string
    invoiceType: number
    job: Schema.Types.ObjectId
    purchaseOrder: Schema.Types.ObjectId
    estimate: Schema.Types.ObjectId
    jobPurchaseOrders: [Schema.Types.ObjectId]
    customer: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    note : String
    charges: number
    shippingCost: number
    tax: number
    total: number
    taxPercentage: number
    createdBy: Schema.Types.ObjectId
    createdAt: Date,
    timeSpent: number
    isFixed: boolean
    hourlyRate: number
    items: [{
        item: Schema.Types.ObjectId
        name: String
        description: String
        price: number
        quantity: number
        tax: number
        subTotal: number
    }]
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
    estimate :{
        type: Schema.Types.ObjectId,
        ref: 'Estimate',
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
    shippingCost: {
        type: Number,
        default: 0
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
    items: [{
        item: {
            type: Schema.Types.ObjectId,
            ref: 'Item',
            required: false
        },
        name: {
            type: String,
            required: false
        },
        description: {
            type: String,
            required: false
        },
        price: {
            type: Number,
            required: false
        },
        quantity: {
            type: Number,
            required: false
        },
        tax: {
            type: Number,
            required: false
        },
        subTotal: {
            type: Number,
            required: false
        },
    }],
})

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema)