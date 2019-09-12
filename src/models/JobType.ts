import mongoose, { Document, Schema } from 'mongoose'

export interface IJobType extends Document {

    title: string
    createdBy: Schema.Types.ObjectId

}

const JobTypeSchema = new Schema({

    title: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Subscriber'
    }

})

export const JobType = mongoose.model<IJobType>('JobType', JobTypeSchema)