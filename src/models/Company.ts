import { Schema } from 'mongoose'
import { User, IUser } from './User'

export interface ICompany extends IUser {

    info: {
        companyName: string
        industry: Schema.Types.ObjectId
        logoUrl: string
    }
    other: {
        tenantId: string
        hasCardOnFile: boolean
    },
    employees: [Schema.Types.ObjectId]
    customers: [Schema.Types.ObjectId]
    stripeId: string
    // subscriptionId: string
    // nextSubscriptionDate: string
    maxTechnicians: number
    maxManagers: number
    maxOfficeAdmins: number
    
}

const CompanySchema = new Schema({

    info: {
        companyName: String,
        industry: { type: Schema.Types.ObjectId, ref: 'Industry' },
        logoUrl: String,
    },
    other: {
        tenantId: String,
        hasCardOnFile: {type: Boolean, default: false}
    },
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    customers: [{ type: Schema.Types.ObjectId, ref: 'Customer' }],
    stripeId: String,
    // subscriptionId: String,
    // nextSubscriptionDate: String,
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

})

export const Company = User.discriminator<ICompany>('Company', CompanySchema)