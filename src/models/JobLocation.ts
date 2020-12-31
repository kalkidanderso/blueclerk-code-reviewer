import mongoose, { Document, Schema } from 'mongoose'
<<<<<<< HEAD
import { IContact } from '../common/contact'



=======
>>>>>>> feat: add job location & job site fields to locationTag and equipment tags
export interface IJobLocation extends Document {
    name: string
    contacts: [Schema.Types.ObjectId],
    location: 'Point'
    address?: {
      city: string,
      state: string,
      street: string,
      zipcode: string
    },
    jobSites?: [Schema.Types.ObjectId]
    customerId: Schema.Types.ObjectId
    companyId: Schema.Types.ObjectId

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
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }

})

export const JobLocation = mongoose.model<IJobLocation>('JobLocation', JobLocationSchema)