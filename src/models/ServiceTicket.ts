import mongoose, { Document, Schema } from 'mongoose'

export interface IServiceTicket extends Document {

    createdAt: Date
    scheduleDateTime: Date
    customer: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    note: string
    company: Schema.Types.ObjectId
    technician: Schema.Types.ObjectId
    ticketId: string
    jobCreated: boolean
    
}

const ServiceTicketSchema = new Schema({

    createdAt: Date,
    scheduleDateTime: Date,
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
    ticketId: String,
    jobCreated: {
        type: Boolean,
        default: false
    }

})

export const ServiceTicket = mongoose.model<IServiceTicket>('ServiceTicket', ServiceTicketSchema)