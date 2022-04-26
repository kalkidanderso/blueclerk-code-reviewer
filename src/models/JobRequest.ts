import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from './Company';;
import { IJobLocation } from './JobLocation';
import { IJobSite } from './JobSite';
import { IJobTypes } from './JobType';
import { IUser } from './User';
/**
 * - add counter in customer for requestId
 * - new collection for jobRequest
 * */

export interface IJobRequest extends Document {

    requestId: string
    status: number
    dueDate: Date
    jobLocation: Schema.Types.ObjectId | IJobLocation
    jobSite: Schema.Types.ObjectId | IJobSite
    customer: Schema.Types.ObjectId
    customerContact: Schema.Types.ObjectId | any
    company: Schema.Types.ObjectId | ICompany
    requests: IRequests[]
    jobCreated: boolean
    track: any[];
    createdBy: Schema.Types.ObjectId
    createdAt: Date
    updatedBy: Schema.Types.ObjectId
    updatedAt: Date
}

export interface IRequests {
    note: string
    category: string
    images?: {
        imageUrl?: string
        uploadedBy?: Schema.Types.ObjectId | IUser
        createdAt?: Date
        updatedAt?: Date
    }[]
}

const JobRequestSchema = new Schema({

    requestId: String,
    status: {
        type: Number,
        default: 0
    },
    dueDate: {
        type: Date,
        required: false
    },
    jobLocation: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
    },
    jobSite: {
        type: Schema.Types.ObjectId,
        ref: 'JobSite',
    },
    requests: [{
        note: String,
        category: String,
        images: [
            {
                imageUrl: String,
                uploadedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'User'
                },
                createdAt: Date
            }
        ],
    }],
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    customerContact: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    track: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        action: String,
        date: Date
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    editedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    editedAt: {
        type: Date
    },
    jobCreated: {
        type: Boolean,
        default: false
    }
}, { timestamps: { createdAt: true, updatedAt: true } })

export const JobRequest = mongoose.model<IJobRequest>('JobRequest', JobRequestSchema);
