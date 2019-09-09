import mongoose, { Document, Schema } from 'mongoose'

export interface ICustomer extends Document {

    info: {
        name: string
        email: string
    }
    address: {
        street: string
        city: string
        state: string
        zipCode: string
    }
    contact: {
        name: string
        phone: string
    }
    isActive: boolean
    subscriber: Schema.Types.ObjectId
    equipments: [Schema.Types.ObjectId]

}

const CustomerSchema = new Schema({

    info: {
        name: String,
        email: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    contact: {
        name: String,
        phone: String,
    },
    isActive: {type: Boolean, default: true},
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: 'Subscriber',
        required: true
    },
    equipments: [{ type: Schema.Types.ObjectId, ref: 'CustomerEquipment' }],

})

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema)