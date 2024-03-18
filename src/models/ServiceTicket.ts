import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '../models/User';
import { IHomeOwner } from '../models/HomeOwner';
import { IJobLocation } from '../models/JobLocation';
import { IJobSite } from '../models/JobSite';
import { IJobTypes } from '../models/JobType';
import { ICustomer } from './Customer';
import { ICompanyLocation } from './CompanyLocation';

export interface IServiceTicket extends Document {

    createdAt: Date
    dueDate: Date
    customer: Schema.Types.ObjectId | ICustomer
    createdBy: Schema.Types.ObjectId
    note: string
    customerPO: string,
    customerContactId: Schema.Types.ObjectId | any
    image?: string,
    images?: {
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
    jobLocation: Schema.Types.ObjectId | IJobLocation
    jobSite: Schema.Types.ObjectId | IJobSite
    isHomeOccupied: boolean
    homeOwner: Schema.Types.ObjectId | IHomeOwner
    homeJobLocation: Schema.Types.ObjectId | IJobLocation
    homeJobSite: Schema.Types.ObjectId | IJobSite
    jobType: Schema.Types.ObjectId // TODO: To be deprecated
    tasks: IJobTypes[]
    item: Schema.Types.ObjectId
    jobCreated: boolean
    track: any[];
    source: string | null;
    workType: Schema.Types.ObjectId  | null
    companyLocation: Schema.Types.ObjectId  | null | ICompanyLocation
    poOverriddenBy: Schema.Types.ObjectId
    type: 'PO Request' | 'Ticket'
    emailHistory?: [{
        sentTo: string
        sentAt: Date,
        sentBy: Schema.Types.ObjectId,
        deliveryStatus: boolean
    }],
    lastEmailSent?: Date
    request?: Schema.Types.ObjectId | any
}

const ServiceTicketSchema = new Schema({

    createdAt: Date,
    dueDate: {
        type: Date,
        required: false
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: false
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    note: {type: String, index: 'text'},
    customerContactId: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    },
    customerPO : String,
    image: String,
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
    isHomeOccupied: {
        type: Boolean,
        default: false
    },
    homeOwner: {
        type: Schema.Types.ObjectId,
        ref: 'HomeOwner'
    },
    homeJobLocation: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation'
    },
    homeJobSite: {
        type: Schema.Types.ObjectId,
        ref: 'JobSite'
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
        },
        quantity: {
            type: Number,
            default: 1
        },
        price: {
            type: Number
        },
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
    },
    workType: {
        type: Schema.Types.ObjectId,
        ref: 'WorkType',
    },
    companyLocation: {
        type: Schema.Types.ObjectId,
        ref: 'CompanyLocation',
    },
    poOverriddenBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['Ticket','PO Request'],
        default: 'Ticket'
    },
    emailHistory: [{
        _id: false,
        sentTo: String,
        sentAt: {
            type: Date,
        },
        sentBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        deliveryStatus: {
            type: Boolean,
            default: true
        }
    }],
    bouncedEmailFlag: {
        type: Boolean,
        default: false
    },
    lastEmailSent: {
        type: Date
    },
    request: {
        type: Schema.Types.ObjectId,
        ref: 'JobRequest',
    },
})

//Indexes
ServiceTicketSchema.index({ customer: 1 });
ServiceTicketSchema.index({ createdBy: 1 });
ServiceTicketSchema.index({ customerContactId: 1 });
ServiceTicketSchema.index({ company: 1 });
ServiceTicketSchema.index({ technician: 1 });
ServiceTicketSchema.index({ editedBy: 1 });
ServiceTicketSchema.index({ jobLocation: 1 });
ServiceTicketSchema.index({ jobSite: 1 });
ServiceTicketSchema.index({ homeOwner: 1 });
ServiceTicketSchema.index({ homeJobLocation: 1 });
ServiceTicketSchema.index({ homeJobSite: 1 });
ServiceTicketSchema.index({ jobType: 1 });
ServiceTicketSchema.index({ item: 1 });
ServiceTicketSchema.index({ company: 1, jobCreated: 1, status: 1 });
ServiceTicketSchema.index({ company: 1, jobCreated: 1, status: 1, type: 1 });
ServiceTicketSchema.index({ company: 1, _id: 1 });

export const ServiceTicket = mongoose.model<IServiceTicket>('ServiceTicket', ServiceTicketSchema);
