import mongoose, { Document, Schema } from 'mongoose'

export interface IJobCharges extends Document {

    charges: number
    isFixed: boolean
    jobType: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date
}

const JobChargesSchema = new Schema({

    charges: Number,
    // true for fixed
    // false for hourly
    isFixed: {
        type: Boolean,
        default: true
    },
    jobType: {
        type: Schema.Types.ObjectId,
        ref: 'JobType',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date
    }

})

export const JobCharges = mongoose.model<IJobCharges>('JobCharges', JobChargesSchema)