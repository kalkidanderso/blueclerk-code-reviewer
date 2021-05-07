import mongoose, { Document, Schema } from 'mongoose'
import { ICustomer } from './Customer';
import {IJobLocation} from './JobLocation';
import {IJobSite} from './JobSite';

export interface ICustomerEquipment extends Document {

    info: {
        model: string
        serialNumber: string
        nfcTag: string
        imageUrl: string
        // location: string
    }
    maintenance: {
        interval: string,
        nextDate: Date,
    }

    type: Schema.Types.ObjectId
    brand: Schema.Types.ObjectId
    customer: ICustomer
    images:[string],
    jobLocation: Schema.Types.ObjectId | IJobLocation,
    jobSite: Schema.Types.ObjectId | IJobSite
    // jobs:[ Schema.Types.ObjectId ]

}

const CustomerEquipmentSchema = new Schema({

    info: {
        model: String,
        serialNumber: String,
        nfcTag: String,
        imageUrl: String,
        // location: String,
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
    jobLocation: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
        // required: true
    },
    jobSite: {
        type: Schema.Types.ObjectId,
        ref: 'JobSite',
    }

    // jobs:[{
    //     type: Schema.Types.ObjectId,
    //     ref: 'Job'
    // }]

})

export const CustomerEquipment = mongoose.model<ICustomerEquipment>('CustomerEquipment', CustomerEquipmentSchema)
