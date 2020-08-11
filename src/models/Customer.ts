import mongoose, { Document, Schema } from 'mongoose'
import { User, IUser} from './User'

export interface ICustomer extends IUser {

    isActive: boolean,
    info:{
        email: String
    }
    contactName: string
    company: Schema.Types.ObjectId
    equipments: [Schema.Types.ObjectId],
    quickbookId: string

}

const CustomerSchema = new Schema({

    isActive: {type: Boolean, default: true},
    info:{
        email: String
    },
    contactName:{
        type: String,
        required: false
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    equipments: [{ type: Schema.Types.ObjectId, ref: 'CustomerEquipment' }],
    quickbookId: {
        type: String,
        default: null
    }

})

export const Customer = User.discriminator<ICustomer>('Customer', CustomerSchema)