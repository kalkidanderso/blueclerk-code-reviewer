import mongoose, { Document, Schema } from 'mongoose'
import { User, IUser} from './User'

export interface ICustomer extends IUser {

    isActive: boolean
    company: Schema.Types.ObjectId
    equipments: [Schema.Types.ObjectId]

}

const CustomerSchema = new Schema({

    isActive: {type: Boolean, default: true},
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    equipments: [{ type: Schema.Types.ObjectId, ref: 'CustomerEquipment' }],

})

export const Customer = User.discriminator<ICustomer>('Customer', CustomerSchema)