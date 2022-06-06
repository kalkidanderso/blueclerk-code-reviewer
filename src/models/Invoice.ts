import mongoose, { Document, Schema } from 'mongoose'
import { InvoiceStatus } from '../common/constants';
import { ICustomer, IQBAddress } from '../models/Customer';
import { IContact } from '../common/contact';
import { IItem } from '../models/Item';
import { IJob } from '../models/Job';
import { IPaymentTerm } from '../models/PaymentTerm';
import { ICompany } from './Company';
import { IUser } from './User';
import { IInvoiceCommission } from './InvoiceCommission';

export interface IInvoice extends Document {
    invoice: any[]
    invoiceId: string
    invoiceType: number
    job: Schema.Types.ObjectId | IJob
    purchaseOrder: Schema.Types.ObjectId
    estimate: Schema.Types.ObjectId
    jobPurchaseOrders: [Schema.Types.ObjectId]
    issuedDate?: Date
    dueDate?: Date
    isDraft?: boolean
    paymentTerm?: Schema.Types.ObjectId | IPaymentTerm
    customerPO?: string
    customerContactId?: Schema.Types.ObjectId | IContact
    vendorId?: string
    customer: Schema.Types.ObjectId | ICustomer
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
        item: Schema.Types.ObjectId | IItem
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
    paymentApplied: number
    balanceDue: number
    paid: boolean // TODO: to be deprecated
    status: InvoiceStatus
    emailHistory?: [{
        sentTo: string
        sentAt: Date
    }],
    lastEmailSent?: Date
    quickbookId?: string
    commission?: Schema.Types.ObjectId | IInvoiceCommission
    isVoid?: boolean
}

export enum LineDetailTypes {
    SalesItemLineDetail = 'SalesItemLineDetail',
    GroupLineDetail = 'GroupLineDetail',
    DescriptionOnly = 'DescriptionOnly',
    DiscountLineDetail = 'DiscountLineDetail',
    SubTotalLineDetail = 'SubTotalLineDetail'
}

export interface IQBInvoice {
    Id?: string
    DocNumber?: string
    TxnDate?: string
    DueDate?: string
    Line?: IQBInvoiceLine[]
    SyncToken?: string
    TotalAmt?: number
    Notes?: string
    TxnTaxDetail?: {
        TotalTax?: number
        TxnTaxCodeRef?: {
            value: string
        }
    }
    SalesTermRef?: {
        name?: string
        value: string
    }
    CustomerRef: {
        name?: string
        value: string
    }
    BillEmail?: {
        Address?: string
    }
    BillAddr?: IQBAddress
    ShipAddr?: IQBAddress
    CustomerMemo?: {
        value: string
    }
    Metadata?: {
        CreateTime?: Date
        LastUpdatedTime?: Date
    }
    CustomField?: {
        DefinitionId: string
        Name?: string
        Type?: string
        StringValue?: string
    }[]
    status?: string
}

export interface IQBInvoiceLine {
    DetailType?: LineDetailTypes
    Amount?: number
    SalesItemLineDetail?: {
        ItemRef?: {
            name?: string
            value?: string
        }
        Qty?: number
        UnitPrice?: number
        DiscountRate?: number
        DiscountAmt?: number
        TaxInclusiveAmt?: number
        TaxCodeRef?: {
            value?: string
        }
    }
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
    purchaseOrder: {
        type: Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: false
    },
    estimate: {
        type: Schema.Types.ObjectId,
        ref: 'Estimate',
        required: false
    },
    jobPurchaseOrders: [{
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
    isDraft: {
        type: Boolean,
        default: false
    },
    paymentTerm: {
        type: Schema.Types.ObjectId,
        ref: 'PaymentTerm'
    },
    note: {
        type: String,
        required: false
    },
    customerPO: String,
    customerContactId: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
    },
    vendorId: String,
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    charges: {
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
    paymentApplied: {
        type: Number,
        default: 0
    },
    balanceDue: Number,
    paid: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: Object.values(InvoiceStatus),
        default: InvoiceStatus.UNPAID
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
    },
    quickbookId: String,
    commission: {
        type: Schema.Types.ObjectId,
        ref: 'InvoiceCommission',
        required: false
    },
    isVoid: {
        type: Boolean,
        default: false
    }
})

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema)
