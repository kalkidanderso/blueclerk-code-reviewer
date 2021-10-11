import mongoose, { Document, Schema } from 'mongoose'
import { IContact } from '../common/contact'
import { ICustomer } from '../models/Customer'
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
    companyId: Schema.Types.ObjectId | ICompany
    inactiveAt?: Date
    inactiveBy?: Schema.Types.ObjectId | IUser
    quickbookId?: string
    createdAt?: Date
    updatedAt?: Date
}

const JobLocationSchema = new Schema({

    name: { type: String, required: true},
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
        required: true
    },
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
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

export const JobLocation = mongoose.model<IJobLocation>('JobLocation', JobLocationSchema)
