import mongoose, { Document, Schema } from 'mongoose'

export interface IServiceTicket extends Document {

    createdAt: Date
    scheduleDate: Date
    dueDate: Date
    customer: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    note: string
    company: Schema.Types.ObjectId
    technician: Schema.Types.ObjectId
    status: number
    editedBy: Schema.Types.ObjectId
    editedAt: Date
    ticketId: string
    jobLocation: Schema.Types.ObjectId
    jobSite: Schema.Types.ObjectId
    jobType: Schema.Types.ObjectId
    jobCreated: boolean
    
}

const ServiceTicketSchema = new Schema({

    createdAt: Date,
    scheduleDate: {
        type: Date,
        required: false
    },
    dueDate: {
        type: Date,
        required: false
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    note: String,
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
        type: Schema.Types.ObjectId,
        ref: 'JobType',
    },
    jobCreated: {
        type: Boolean,
        default: false
    }

})

export const ServiceTicket = mongoose.model<IServiceTicket>('ServiceTicket', ServiceTicketSchema)