import mongoose, { Document, Schema } from 'mongoose'

export interface IJob extends Document {

    dateTime: Date
    technician: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    type: Schema.Types.ObjectId
    subscriber: Schema.Types.ObjectId

}

const JobSchema = new Schema({

    dateTime: Date,
    technician: {
        type: Schema.Types.ObjectId,
        ref: 'NonSubscriber',
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
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: 'Subscriber',
        required: true
    },

})

export const Job = mongoose.model<IJob>('Job', JobSchema)