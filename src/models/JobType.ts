import mongoose, { Document, Schema } from 'mongoose'

export interface IJobType extends Document {

    title: string
    industry: string
    createdBy: Schema.Types.ObjectId

}

const JobTypeSchema = new Schema({

    title: String,
    industry: {
        type: Schema.Types.ObjectId,
        ref: 'Industry',
        default: null
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    }

})

export const JobType = mongoose.model<IJobType>('JobType', JobTypeSchema)