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

    name: { type: String, required: false, index: 'text'},
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
      city: { type: String, index: "text" },
      state: { type: String, index: "text" },
      street: { type: String, index: "text" },
      zipcode: { type: String, index: "text" }, 
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

}, { timestamps: true });

//Indexes
JobSiteSchema.index({ locationId: 1 });
JobSiteSchema.index({ customerId: 1 });
JobSiteSchema.index({ homeOwner: 1 });
JobSiteSchema.index({ isActive: 1 });
JobSiteSchema.index({ _id: 1, customerId: 1, isActive: 1 });
JobSiteSchema.index({ 'address.street': 1 });
JobSiteSchema.index({ 'address.city': 1 });


export const JobSite = mongoose.model<IJobSite>('JobSite', JobSiteSchema);
