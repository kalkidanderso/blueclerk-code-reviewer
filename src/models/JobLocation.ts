import mongoose, { Document, Schema } from 'mongoose'

export interface IJobLocation extends Document {

    name: string
    contact: {
      name: string
      phone: string
      email: string
    }
    location: 'Point'
    address: {
      city: string,
      state: string,
      street: string,
      zipcode: string
    }
    customerId: Schema.Types.ObjectId
    companyId: Schema.Types.ObjectId

}

const JobLocationSchema = new Schema({

    name: { type: String, required: true},
    contact: {
      name: String,
      phone: String,
      email: String
    },
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