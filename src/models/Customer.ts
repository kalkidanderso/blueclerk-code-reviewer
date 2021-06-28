import mongoose, { Document, Schema } from 'mongoose'
import { User, IUser} from './User'
import { IContact } from '../common/contact'
import { IPriceTier } from './PriceTier'

export interface ICustomer extends IUser {

    isActive: boolean
    info:{
        email: string
    }
    contactName: string
    company: Schema.Types.ObjectId
    equipments: [Schema.Types.ObjectId]
    jobLocations: [Schema.Types.ObjectId]
    quickbookId: string
    balance: number,
    itemTier: Schema.Types.ObjectId | IPriceTier
    isCustomPrice?: boolean
    customPrices?: {
        quantity: number,
        price: number
    }[]
    vendorId?: string,
    contacts: [Schema.Types.ObjectId],
    contactEmail: string

}

const CustomerSchema = new Schema({

    isActive: {type: Boolean, default: true},
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
    vendorId: {
        type: String,
    },
    contacts: [{
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    }]

})

export const Customer = User.discriminator<ICustomer>('Customer', CustomerSchema)
