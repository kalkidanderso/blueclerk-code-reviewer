import mongoose, { Document, Schema } from 'mongoose'

export interface IJobSite extends Document {

    name: string
    location: 'Point'
    address: {
      city: string,
      state: string,
      street: string,
      zipcode: string
    }
    locationId: Schema.Types.ObjectId
    customerId: Schema.Types.ObjectId

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
        required: true
    }

})

export const JobSite = mongoose.model<IJobSite>('JobSite', JobSiteSchema)