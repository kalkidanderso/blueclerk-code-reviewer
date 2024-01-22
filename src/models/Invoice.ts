import mongoose, {Document, Schema} from 'mongoose';
import {InvoiceStatus} from '../common/constants';
import {ICustomer, IQBAddress} from '../models/Customer';
import {IContact} from '../common/contact';
import {IItem} from '../models/Item';
import {IJob} from '../models/Job';
import {IPaymentTerm} from '../models/PaymentTerm';
import {ICompany} from './Company';
import {IUser} from './User';
import {IInvoiceCommission} from '../models/InvoiceCommission';
import {IJobLocation} from '../models/JobLocation';
import {IJobSite} from '../models/JobSite';
import {IWorkType} from './WorkType';
import {ICompanyLocation} from './CompanyLocation';

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
    jobLocation: Schema.Types.ObjectId | IJobLocation
    jobSite: Schema.Types.ObjectId | IJobSite
    company: Schema.Types.ObjectId
    note: string
    charges: number
    shippingCost: number
    tax: number // TODO: to be deprecated
    taxAmount: number
    subTotal: number
    total: number
    taxPercentage: number // TODO: to be deprecated
    timeSpent: number
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
        sentAt: Date,
        sentBy: Schema.Types.ObjectId,
        deliveryStatus: boolean
    }],
    bouncedEmailFlag: boolean,
    lastEmailSent?: Date
    quickbookId?: string
    commission?: Schema.Types.ObjectId | IInvoiceCommission
    isVoid?: boolean
    createdBy: Schema.Types.ObjectId
    createdAt: Date
    updatedAt: Date
    workType: Schema.Types.ObjectId | IWorkType
    companyLocation: Schema.Types.ObjectId | ICompanyLocation
    technicianMessages: {
        notes: [
            {
                id: string,
                comment: string
            }
        ],
        images: [string]
    },
    showJobId: boolean,
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
        TaxLine?: {
            Amount?: number,
            DetailType?: string,
            TaxLineDetail?: {
                TaxRateRef?: {
                    value?: string
                },
                PercentBased?: boolean,
                TaxPercent?: number,
                NetAmountTaxable?: number
            }
        }[]
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
    status?: string,
    Balance?: number,
    PrivateNote?: string,
}

export interface IQBInvoiceLine {
    DetailType?: LineDetailTypes
    Amount?: number
    Description?: string
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
    jobLocation: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation'
    },
    jobSite: {
        type: Schema.Types.ObjectId,
        ref: 'JobSite'
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
    timeSpent: {
        type: Number,
        default: 0
    },
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
        },
        sentBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        deliveryStatus: {
            type: Boolean,
            default: true
        }
    }],
    bouncedEmailFlag: {
        type: Boolean,
        default: false
    },
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
    },
    workType: {
        type: Schema.Types.ObjectId,
        ref: 'WorkType',
    },
    companyLocation: {
        type: Schema.Types.ObjectId,
        ref: 'CompanyLocation',
    },
    technicianMessages: {
        _id: false,
        notes: [{
            _id: false,
            id: String,
            comment: String,
        }],
        images: {
            type: [String],
            required: false
        }
    },
    showJobId: {
        type: Boolean,
        default: true,
    }
}, {timestamps: {createdAt: true, updatedAt: true}});

//Indexes
InvoiceSchema.index({customer: 1});
InvoiceSchema.index({job: 1});
InvoiceSchema.index({purchaseOrder: 1});
InvoiceSchema.index({estimate: 1});
InvoiceSchema.index({jobPurchaseOrders: 1});
InvoiceSchema.index({paymentTerm: 1});
InvoiceSchema.index({customerPO: 1});
InvoiceSchema.index({vendorId: 1});
InvoiceSchema.index({jobLocation: 1});
InvoiceSchema.index({jobSite: 1});
InvoiceSchema.index({company: 1});
InvoiceSchema.index({customerContactId: 1});
InvoiceSchema.index({customer: 1, isDraft: 1});
InvoiceSchema.index({job: 1, isDraft: 1});
InvoiceSchema.index({issuedDate: 1, isDraft: 1});
InvoiceSchema.index({job: 1, company: 1, isVoid: 1});
InvoiceSchema.index({customer: 1, company: 1, isVoid: 1});
InvoiceSchema.index({company: 1, job: 1, isDraft: 1, issuedDate: 1});
InvoiceSchema.index({company: 1, 'technicians.contractor': 1, isDraft: 1});
InvoiceSchema.index({company: 1, 'technicians.technician': 1, isDraft: 1});
InvoiceSchema.index({company: 1, quickbookId: 1, isDraft: 1, isVoid: 1});
InvoiceSchema.index({company: 1, createdAt: -1, _id: -1, isDraft: 1, isVoid: 1});
InvoiceSchema.index({company: 1, job: 1, issuedDate: 1, note: 1, vendorId: 1, invoiceId: 1});
InvoiceSchema.index({company: 1, job: 1, isDraft: 1, issuedDate: 1});
InvoiceSchema.index({company: 1,createdAt: -1,isDraft: 1,isVoid: 1,invoiceId: 1,status: 1,customerPO: 1,vendorId: 1});


export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
