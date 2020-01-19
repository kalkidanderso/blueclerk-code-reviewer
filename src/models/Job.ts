import mongoose, { Document, Schema } from 'mongoose'

export interface IJob extends Document {

    dateTime: Date
    technician: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    type: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    description: string
    status: number,
    createdAt: Date,
    createdBy: Schema.Types.ObjectId,
}

const JobSchema = new Schema({

    dateTime: Date,
    technician: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
    description: {
        type: String
    },
    status: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

})

export const Job = mongoose.model<IJob>('Job', JobSchema)