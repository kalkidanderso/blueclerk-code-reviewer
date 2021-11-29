import mongoose, { Document, Schema } from 'mongoose'
import { IJobTypes } from './JobType';
import { IUser } from './User';

export interface IServiceTicket extends Document {

    createdAt: Date
    dueDate: Date
    customer: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    note: string
    customerPO: string,
    customerContactId: Schema.Types.ObjectId | any
    image: string,
    images: {
        _id?: Schema.Types.ObjectId
        imageUrl?: string
        uploadedBy?: Schema.Types.ObjectId | IUser
        createdAt?: Date
        updatedAt?: Date
    }[]
    company: Schema.Types.ObjectId
    technician: Schema.Types.ObjectId
    status: number
    editedBy: Schema.Types.ObjectId
    editedAt: Date
    ticketId: string
    jobLocation: Schema.Types.ObjectId
    jobSite: Schema.Types.ObjectId
    jobType: Schema.Types.ObjectId // TODO: To be deprecated
    tasks: IJobTypes[]
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
    images: [
        { 
            imageUrl: {
                type: String,
                required: true
            },
            uploadedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            createdAt: Date
        }
    ],
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
    tasks: [{
        _id: false,
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
