import mongoose, { Document, Schema } from 'mongoose'

export interface ICompany extends Document{

    info: {
        companyName: string
        industry: Schema.Types.ObjectId
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
    employees: [Schema.Types.ObjectId]
    customers: [Schema.Types.ObjectId]
    stripeId: string
    paid: boolean
    type: number
    chargeDate: Date
    maxTechnicians: number
    maxManagers: number
    maxOfficeAdmins: number
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
    emailPreferences: Number,
    currentJobId: number,
    prefix: string,
    admin: Schema.Types.ObjectId,
    qbAccessToken: string,
    qbRefreshToken: string,
    realmId: string,
    customersSynced: boolean,
    customersSyncedAt: Date,
    socketId: string,
    qbAuthorized: boolean,
    qbRefeshTokenExpiry: Date,
    currentInvoiceId: number,
    invoicePrefix: string,
    currentPOId: number
    currentEstimateId: number
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
    chargeDate: Date, // signup + 30 days
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
    customersSynced: {
        type: Boolean,
        default: false
    },
    customersSyncedAt: Date,
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
        type: Number,
        default: 0
        // 0 for email everytime a job is scheduled
        // 1 for once a day at night
        // 2 no emails
    },
    invoicePrefix: String,
    currentPOId: {
        type: Number,
        default: 0
    },
    currentEstimateId: {
        type: Number,
        default: 0
    }
})

// export const Company = User.discriminator<ICompany>('Company', CompanySchema)
export const Company = mongoose.model<ICompany>('Company', CompanySchema)
