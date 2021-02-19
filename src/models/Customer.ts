import mongoose, { Document, Schema } from 'mongoose'
import { User, IUser} from './User'
import { IContact } from '../common/contact'

export interface ICustomer extends IUser {

    isActive: boolean
    info:{
        email: String
    }
    contactName: string
    company: Schema.Types.ObjectId
    equipments: [Schema.Types.ObjectId]
    jobLocations: [Schema.Types.ObjectId]
    quickbookId: string
    balance: number,
    vendorId?: string,
    contacts: IContact[],
    phone: string,
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
