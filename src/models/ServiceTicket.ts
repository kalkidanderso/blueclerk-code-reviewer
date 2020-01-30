import mongoose, { Document, Schema } from 'mongoose'

export interface IServiceTicket extends Document {

    createdAt: Date,
    scheduleTime: Date
    customer: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    comment: string
    note: string
    company: Schema.Types.ObjectId
    
}

const ServiceTicketSchema = new Schema({

    createdAt: Date,
    scheduleTime: Date,
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comment: String,
    note: String,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },

})

export const ServiceTicket = mongoose.model<IServiceTicket>('ServiceTicket', ServiceTicketSchema)