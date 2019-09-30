import mongoose, { Document, Schema } from 'mongoose'

export interface IJob extends Document {

    dateTime: Date
    technician: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    type: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    comment: String
    status: String
}

const JobSchema = new Schema({

    dateTime: Date,
    technician: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    type: {
        type: Schema.Types.ObjectId,
        ref: 'JobType',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    comment: {
        type: String
    },
    status: {
        type: String,
        default: 'Pending'
    }

})

export const Job = mongoose.model<IJob>('Job', JobSchema)