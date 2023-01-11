import mongoose, { Document, Schema } from 'mongoose';
import { ICompanyAdmin } from '../models/CompanyAdmin';
import { ICompanyInvoice } from '../models/CompanyInvoice';
import { IPriceTier } from '../models/PriceTier';
import { IPaymentTerm } from '../models/PaymentTerm';
import { IUser } from '../models/User';

export interface ICompany extends Document{

    info: {
        companyName: string
        industry?: Schema.Types.ObjectId
        logoUrl: string,
        companyEmail: string
    },
    address: {
        street: string
        city: string
        state: string
        zipCode: string
    }
    contact: {
        phone: string
        fax: string
    }
    other: {
        tenantId: string
        hasCardOnFile: boolean
    },
    employees: [Schema.Types.ObjectId] | any[]
    customers: [Schema.Types.ObjectId]
    stripeId: string
    paid: boolean
    type: number
    plan: number
    chargeDate: Date
    trialEndDate?: Date
    maxTechnicians: number
    maxManagers: number
    maxOfficeAdmins: number
    maxAdmins: number
    userPermissions: {
        0: {
            on: [Number],
            off: [Number],
        },
        1: {
            on: [Number],
            off: [Number],
        },
        2: {
            on: [Number],
            off: [Number],
        },
        3: {
            on: [Number],
            off: [Number],
        },
    },
    emailPreferences: {
        preferences: Number,
        time: Date,
        timeZone: String
    },
    currentJobId: number,
    prefix: string,
    admin: Schema.Types.ObjectId | ICompanyAdmin,
    qbAccessToken: string,
    qbRefreshToken: string,
    realmId: string,
    qbCompanyName?: string,
    qbCompanyEmail?: string,
    customersSynced: boolean, // TODO: To be deprecated
    customersSyncedAt: Date,  // TODO: To be deprecated
    qbSync?: {
        customersSynced?: boolean
        customersSyncedAt?: Date
        itemsSynced?: boolean
        itemsSyncedAt?: Date
        paymentTermSynced?: boolean
        paymentTermSynedAt?: Date
        invoicesSynced?: boolean
        invoicesSyncedAt?: Date
        paymentsSynced?: boolean
        paymentsSyncedAt?: Date
    }
    socketId: string,
    qbAuthorized: boolean,
    qbRefeshTokenExpiry: Date,
    currentInvoiceId: number,
    invoicePrefix: string,
    currentPOId: number
    currentEstimateId: number
    itemTier: {
        count: number
        list: { tier: Schema.Types.ObjectId | IPriceTier }[]
    }
    paymentTerm?: Schema.Types.ObjectId | IPaymentTerm
    companyInvoices: ICompanyInvoice[];
    balance: number;
    credit: number;
    commission: number;
    blockchain?: {
        attachments?: string,
        verified: boolean,
        verifiedAt: Date,
        verifiedBy: Schema.Types.ObjectId | IUser
        deniedAt: Date,
        deniedBy: Schema.Types.ObjectId | IUser
    }
}

export interface IQBCompany {
    CompanyName?: string
    LegalName?: string
    CompanyAddr?: {
        Id?: string
        Line1?: string
        Line2?: string
        City?: string
        CountrySubDivisionCode?: string
        PostalCode?: string
        Lat?: string
        Long?: string
    }
    Email?: {
        Address?: string
    }
}



const CompanySchema = new Schema({

    info: {
        companyName: String,
        industry: { type: Schema.Types.ObjectId, ref: 'Industry' },
        logoUrl: String,
        companyEmail: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    contact: {
        phone: String,
        fax: String,
    },
    other: {
        tenantId: String,
        hasCardOnFile: {type: Boolean, default: false}
    },
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    customers: [{ type: Schema.Types.ObjectId, ref: 'Customer' }],
    stripeId: String,
    paid: {
        type: Boolean,
        default: false
    },
    // type 0 for company
    // type 1 for contractor
    type: {
        type: Number,
        default: 0
    },
    // type 0 for subscribed
    // type 1 for free
    plan: {
      type: Number,
      default: 0
    },
    chargeDate: Date, // signup + 30 days
    trialEndDate: Date, // signup + 30 days
    maxTechnicians: {
        type: Number,
        default: 0
    },
    maxManagers: {
        type: Number,
        default: 0
    },
    maxOfficeAdmins: {
        type: Number,
        default: 0
    },
    maxAdmins: {
        type: Number,
        default: 0
    },
    userPermissions: {
        0: {
            on: [Number],
            off: [Number],
        },
        1: {
            on: [Number],
            off: [Number],
        },
        2: {
            on: [Number],
            off: [Number],
        },
        3: {
            on: [Number],
            off: [Number],
        },
    },
    currentJobId: {
        type: Number,
        default: 0
    },
    prefix: {
        type: String
    },
    admin: { type: Schema.Types.ObjectId, ref: 'CompanyAdmin' },
    qbAccessToken: String,
    qbRefreshToken: String,
    realmId: String,
    qbCompanyName: String,
    qbCompanyEmail: String,
    customersSynced: {
        // TODO: To be deprecated
        type: Boolean,
        // default: false
    },
    customersSyncedAt: Date,  // TODO: To be deprecated
    qbSync: {
        customersSynced: {
            type: Boolean,
            default: false
        },
        customersSyncedAt: Date,
        itemsSynced: {
            type: Boolean,
            default: false
        },
        itemsSyncedAt: Date,
        paymentTermSynced: {
            type: Boolean,
            default: false
        },
        paymentTermSynedAt: Date,
        invoicesSynced: {
            type: Boolean,
            default: false
        },
        invoicesSyncedAt: Date,
        paymentsSynced: {
            type: Boolean,
            default: false
        },
        paymentsSyncedAt: Date,
    },
    socketId: String,
    qbAuthorized: {
        type: Boolean,
        default: false
    },
    qbRefeshTokenExpiry: Date,
    currentInvoiceId: {
        type:Number,
        default: 0
    },
    emailPreferences: {
        preferences: {
            type: Number,
            default: 0
            // 0 for email everytime a job is scheduled
            // 1 for once a day at night
            // 2 no emails
        },
        time: {
            type: Date
        },
        timeZone: {
            type: String,
            default: 'America/Chicago'
        }
    },
    invoicePrefix: String,
    currentPOId: {
        type: Number,
        default: 0
    },
    currentEstimateId: {
        type: Number,
        default: 0
    },
    itemTier: {
        count: {
            type: Number,
            default: 0
        },
        list: [{
            _id: false,
            tier: {
                type: Schema.Types.ObjectId,
                ref: 'PriceTier'
            },
        }]
    },
    paymentTerm: {
        type: Schema.Types.ObjectId,
        ref: 'PaymentTerm'
    },
    balance: {
        type: Number,
        default: 0
    },
    credit: {
        type: Number,
        default: 0
    },
    commission: {
        type: Number,
        default: null
    },
     
    companyInvoices: [{ type: Schema.Types.ObjectId, ref: 'CompanyInvoice' }],
    blockchain: {
        verified: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date,
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        deniedAt: Date,
        deniedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }

}, { timestamps: { createdAt: true, updatedAt: true } })

// export const Company = User.discriminator<ICompany>('Company', CompanySchema)
export const Company = mongoose.model<ICompany>('Company', CompanySchema)
