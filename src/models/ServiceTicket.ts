import mongoose, { Document, Schema } from 'mongoose'
import { IJobType } from './JobType';

export interface IServiceTicket extends Document {

    createdAt: Date
    dueDate: Date
    customer: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    note: string
    customerPO: string,
    customerContactId: Schema.Types.ObjectId | any
    image: string
    company: Schema.Types.ObjectId
    technician: Schema.Types.ObjectId
    status: number
    editedBy: Schema.Types.ObjectId
    editedAt: Date
    ticketId: string
    jobLocation: Schema.Types.ObjectId
    jobSite: Schema.Types.ObjectId
    jobType: Schema.Types.ObjectId // TODO: To be deprecated
    jobTypes: {
        jobType: Schema.Types.ObjectId | IJobType
    }[]
    item: Schema.Types.ObjectId
    jobCreated: boolean
    track: any[];
    source: string | null;

}

const ServiceTicketSchema = new Schema({

    createdAt: Date,
    dueDate: {
        type: Date,
        required: false
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    note: String,
    customerContactId: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    },
    customerPO : String,
    image: String,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    technician: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    status: {
        type: Number,
        default: 0
    },
    track: [{
        user: {
         type: Schema.Types.ObjectId,
         ref: 'User'
     },
        action: String,
        date: Date
    }
    ],
    editedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    editedAt: {
        type: Date
    },
    ticketId: String,
    jobLocation: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
    },
    jobSite: {
        type: Schema.Types.ObjectId,
        ref: 'JobSite',
    },
    jobType: {
        // TODO: To be deprecated
        type: Schema.Types.ObjectId,
        ref: 'JobType',
    },
    jobTypes: [{
        jobType: {
            type: Schema.Types.ObjectId,
            ref: 'JobType'
        }
    }],
    item: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
    },
    jobCreated: {
        type: Boolean,
        default: false
    },
    source: {
        type: String,
        default: 'blueclerk'
    }

})

export const ServiceTicket = mongoose.model<IServiceTicket>('ServiceTicket', ServiceTicketSchema)
