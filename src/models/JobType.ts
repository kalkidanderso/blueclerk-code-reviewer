import mongoose, { Document, Schema } from 'mongoose';
import { IItem } from './Item';

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

    jobType: Schema.Types.ObjectId | IJobType | IItem
    quantity: number
    price: number
    status: number

}

const JobTypeSchema = new Schema({

    title: { type: String, index: 'text' },
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
);

//Indexes
JobTypeSchema.index({ industry: 1 });
JobTypeSchema.index({ createdBy: 1, quickbookId: 1 });
JobTypeSchema.index({ title: 1, industry: 1, createdBy: 1 });
JobTypeSchema.index({ createdBy: 1, industry: 1, isActive: 1 });


export const JobType = mongoose.model<IJobType>('JobType', JobTypeSchema);