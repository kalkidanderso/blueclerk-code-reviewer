import mongoose, { Document, Schema } from 'mongoose'
import { User, IUser} from './User'
import { IContact } from '../common/contact'
import { IPriceTier } from './PriceTier'
import { IJobLocation } from '../models/JobLocation'
import { IPaymentTerm } from '../models/PaymentTerm'

export interface ICustomer extends IUser {

    isActive: boolean
    info:{
        email: string
    }
    contactName: string
    company: Schema.Types.ObjectId
    equipments: [Schema.Types.ObjectId]
    jobLocations: [Schema.Types.ObjectId | IJobLocation]
    quickbookId: string
    balance: number,
    credit: number,
    itemTier: Schema.Types.ObjectId | IPriceTier
    isCustomPrice?: boolean
    customPrices?: {
        quantity: number,
        price: number
    }[]
    paymentTerm?: Schema.Types.ObjectId | IPaymentTerm
    vendorId?: string,
    contacts: [Schema.Types.ObjectId],
    contactEmail: string
    inactiveAt: string
    inactiveBy: string

}

export interface IQBCustomer {

    Id?: string
    PrimaryEmailAddr: {
        Address: string
    }
    DisplayName: string
    GivenName?: string
    FamilyName?: string
    CompanyName?: string
    BusinessNumber?: string
    PrimaryPhone?: {
        FreeFormNumber?: string
    }
    Active?: boolean
    Job?: boolean
    ParentRef?: {
        value: string
    }
    Level?: number
    BillAddr?: IQBAddress
    ShipAddr?: IQBAddress

}

export interface IQBAddress {
    Line1?: string
    Line2?: string
    City?: string
    CountrySubDivisionCode?: string
    Country?: string
    PostalCode?: string
    Long?: string
    Lat?: string
}

const CustomerSchema = new Schema({

    isActive: {type: Boolean, default: true},
    inactiveAt: {
        type: Date
    },
    inactiveBy: {
        type: String
    },
    info:{
        email: String
    },
    contactName: {
        type: String,
        required: false
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    equipments: [{ type: Schema.Types.ObjectId, ref: 'CustomerEquipment' }],
    jobLocations: [{
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
        required: false
    }],
    quickbookId: {
        type: String,
        default: null
    },
    balance: {
        type: Number,
        default: 0
    },
    credit: {
        type: Number,
        default: 0
    },
    itemTier: {
        type: Schema.Types.ObjectId,
        ref: 'PriceTier'
    },
    isCustomPrice: {
        type: Boolean,
        default: false
    },
    customPrices: [{
        _id: false,
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0,
            required: true
        }
    }],
    paymentTerm: {
        type: Schema.Types.ObjectId,
        ref: 'PaymentTerm'
    },
    vendorId: {
        type: String,
    },
    contacts: [{
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    }]

}, { timestamps: { createdAt: true, updatedAt: true } });

export const Customer = User.discriminator<ICustomer>('Customer', CustomerSchema)
