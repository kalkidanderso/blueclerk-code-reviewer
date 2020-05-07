import mongoose, { Document, Schema } from 'mongoose'

export interface ICustomerEquipment extends Document {

    info: {
        model: string
        serialNumber: string    
        nfcTag: string
        imageUrl: string
        location: string
    }
    maintenance: {
        interval: string,
        nextDate: Date,    
    }

    type: Schema.Types.ObjectId
    brand: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    images:[string]
    // jobs:[ Schema.Types.ObjectId ]

}

const CustomerEquipmentSchema = new Schema({

    info: {
        model: String,
        serialNumber: String,    
        nfcTag: String,
        imageUrl: String,
        location: String,
    },
    maintenance: {
        interval: String,
        nextDate: Date,    
    },
    type: {
        type: Schema.Types.ObjectId,
        ref: 'EquipmentType',
        required: true
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'EquipmentBrand',
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    images: [String],

    // jobs:[{ 
    //     type: Schema.Types.ObjectId,
    //     ref: 'Job'
    // }]

})

export const CustomerEquipment = mongoose.model<ICustomerEquipment>('CustomerEquipment', CustomerEquipmentSchema)