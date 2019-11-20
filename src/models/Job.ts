import mongoose, { Document, Schema } from 'mongoose'

export interface IJob extends Document {

    dateTime: Date
    technician: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    type: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    equipmentId: string
    comment: string
    description: string
    status: number,
    createdAt: Date
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
    equipmentId: {
        type: Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        default: null
    },
    comment: {
        type: String
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

})

export const Job = mongoose.model<IJob>('Job', JobSchema)