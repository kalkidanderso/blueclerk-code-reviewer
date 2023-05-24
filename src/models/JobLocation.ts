import mongoose, { Document, Schema } from 'mongoose'
import { IContact } from '../common/contact'
import { ICustomer } from '../models/Customer'
import { IHomeOwner } from '../models/HomeOwner'
import { ICompany } from '../models/Company'
import { IUser } from '../models/User'

export interface IJobLocation extends Document {
    name: string
    contacts: [Schema.Types.ObjectId | IContact] | any,
    location: {
      type?: 'Point',
      coordinates: number[]
    }
    address?: {
      city: string,
      state: string,
      street: string,
      zipcode: string
    },
    jobSites?: [Schema.Types.ObjectId]
    isActive?: boolean
    customerId: Schema.Types.ObjectId | ICustomer
    homeOwner: Schema.Types.ObjectId | IHomeOwner
    companyId: Schema.Types.ObjectId | ICompany
    inactiveAt?: Date
    inactiveBy?: Schema.Types.ObjectId | IUser
    quickbookId?: string
    createdAt?: Date
    updatedAt?: Date
}

const JobLocationSchema = new Schema({

    name: { type: String, required: true, index: "text" },
    contacts: [{
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: false
    }],
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
    jobSites: [{
        type: Schema.Types.ObjectId,
        ref: 'JobSite',
        required: false
    }],
    address: {
      city: String,
      state: String,
      street: String,
      zipcode: String
    },
    isActive: {
      type: Boolean,
      default: true
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
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        // required: true
    },
    inactiveAt: {
        type: Date
    },
    inactiveBy: {
        type: String,
        ref: 'User'
    },
    quickbookId: String

}, { timestamps: { createdAt: true, updatedAt: true } });

//Indexes
JobLocationSchema.index({ contacts: 1 });
JobLocationSchema.index({ jobSites: 1 });
JobLocationSchema.index({ companyId: 1 });
JobLocationSchema.index({ customerId: 1 });
JobLocationSchema.index({ homeOwner: 1 });
JobLocationSchema.index({ isActive: 1 });
JobLocationSchema.index({ contacts: 1 });
JobLocationSchema.index({ 'address.street': 1 });
JobLocationSchema.index({ 'address.city': 1 });
JobLocationSchema.index({ _id: 1, customerId: 1, isActive: 1 })
JobLocationSchema.index({ companyId: 1, quickbookId: 1 })
JobLocationSchema.index({ customerId: 1, companyId: 1, name: 1, address: 1, location: 1 })

export const JobLocation = mongoose.model<IJobLocation>('JobLocation', JobLocationSchema)
