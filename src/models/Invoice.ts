import mongoose, { Document, Schema } from 'mongoose'

export interface IInvoice extends Document {
    invoice: any[]
    invoiceId: string
    invoiceType: number
    job: Schema.Types.ObjectId
    purchaseOrder: Schema.Types.ObjectId
    estimate: Schema.Types.ObjectId
    jobPurchaseOrders: [Schema.Types.ObjectId]
    issuedDate?: Date
    dueDate?: Date
    customer: Schema.Types.ObjectId | any
    company: Schema.Types.ObjectId
    note: string
    charges: number
    shippingCost: number
    tax: number // TODO: to be deprecated
    taxAmount: number
    subTotal: number
    total: number
    taxPercentage: number // TODO: to be deprecated
    createdBy: Schema.Types.ObjectId
    createdAt: Date
    timeSpent: number
    // isFixed: boolean
    // hourlyRate: number
    items: [{
        item: Schema.Types.ObjectId
        name: string
        description: string
        isFixed: boolean
        hourlyRate: number
        price: number
        quantity: number
        tax: number
        taxAmount: number
        subTotal: number
    }]
    paid: boolean
    emailHistory?: [{
        sentTo: string
        sentAt: Date
    }],
    lastEmailSent?: Date
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
    issuedDate: {
        type: Date
    },
    dueDate: {
        type: Date
    },
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
    taxAmount: {
        type: Number,
        default: 0
    },
    subTotal: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    tax: {
        // TODO: to be deprecated
        type: Number,
        // default: 0
    },
    taxPercentage: {
        // TODO: to be deprecated
        type: Number,
        // default: 0
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
    // isFixed: {
    //     type: Boolean,
    //     default: false
    // },
    // hourlyRate: {
    //     type: Number,
    //     default: 0
    // },
    items: [{
        _id: false,
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
        isFixed: {
            type: Boolean,
            default: true
        },
        tax: {
            type: Number,
            required: false
        },
        taxAmount: {
            type: Number,
            default: 0
        },
        subTotal: {
            type: Number,
            required: false,
            default: 0
        },
    }],
    paid:{
        type: Boolean,
        default: false
    },
    emailHistory: [{
        _id: false,
        sentTo: String,
        sentAt: {
            type: Date,
        }
    }],
    lastEmailSent: {
        type: Date
    }
})

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema)
