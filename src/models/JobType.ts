import mongoose, { Document, Schema } from 'mongoose'

export interface IJobType extends Document {

    title: string
    description?: string
    sku?: string
    industry: string
    createdBy: Schema.Types.ObjectId
    isActive: boolean
    quickbookId?: string
    createdAt?: Date
    updatedAt?: Date
}

export interface IJobTypes {

    jobType: Schema.Types.ObjectId | IJobType

}

const JobTypeSchema = new Schema({

    title: { type: String, index: "text" },
    description: String,
    sku: String,
    industry: {
        type: Schema.Types.ObjectId,
        ref: 'Industry',
        default: null
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    },
    isActive:{
        type: Boolean,
        default: true
    },
    quickbookId: String

}, { timestamps: { createdAt: true, updatedAt: true } }
)

export const JobType = mongoose.model<IJobType>('JobType', JobTypeSchema)