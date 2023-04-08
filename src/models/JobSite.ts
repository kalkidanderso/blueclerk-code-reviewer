import mongoose, { Document, Schema } from 'mongoose'
import { ICustomer } from '../models/Customer'
import { IHomeOwner } from '../models/HomeOwner'

export interface IJobSite extends Document {

    name: string
    location: 'Point'
    isActive: boolean
    address: {
      city: string,
      state: string,
      street: string,
      zipcode: string
    }
    locationId: Schema.Types.ObjectId
    customerId: Schema.Types.ObjectId | ICustomer
    homeOwner: Schema.Types.ObjectId | IHomeOwner
    createdAt?: Date
    updatedAt?: Date

}

const JobSiteSchema = new Schema({

    name: { type: String, required: false},
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: false
      },
      coordinates: {
        type: [Number],
        required: false
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    address: {
      city: String,
      state: String,
      street: String,
      zipcode: String
    },
    locationId: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
        required: true
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        // required: true
    },
    homeOwner: {
        type: Schema.Types.ObjectId,
        ref: 'HomeOwner'
    },
    isHomeOccupied: {
      type: Boolean,
      default: false
    }

}, { timestamps: true });

export const JobSite = mongoose.model<IJobSite>('JobSite', JobSiteSchema);
