import mongoose, { Document, Schema } from 'mongoose'

export interface IJob extends Document {

    dateTime: Date
    jobId: string
    ticket: Schema.Types.ObjectId
    technician: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    type: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    equipmentId: string
    description: string
    status: number,
    comment: string
    createdAt: Date,
    createdBy: Schema.Types.ObjectId,
    employeeType: boolean
    // isFixed: boolean
    // hourlyRate: number
    charges: number
    salesTax: Schema.Types.ObjectId
    startTime: Date
    endTime: Date
    timeSpent: number
    timeUpdatedBy: Schema.Types.ObjectId
    timeUpdatedAt: Date
    equipment_scanned: boolean
    no_of_equipment_scanned: number
}

const JobSchema = new Schema({

    dateTime: Date,
    jobId: String,
    ticket: {
        type: Schema.Types.ObjectId,
        ref: 'ServiceTicket',
        required: true
    },
    equipmentId: {
        type: Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        required: false
    },
    technician: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: Schema.Types.ObjectId,
        ref: 'JobType',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    description: {
        type: String
    },
    status: {
        type: Number,
        default: 0
    },
    comment: {
        type: String
    },
    createdAt: {
        type: Date
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // employee type 0 for company employee
    // employee type 1 for external employee
    employeeType: {
        type: Boolean,
        default: false
    },
    // isFixed: {
    //     type: Boolean,
    //     default: true
    // },
    // hourlyRate:{
    //     type: Number,
    //     default: 0
    // },
    charges: {
        type: Number,
        default: 0
    },
    salesTax: {
        type: Schema.Types.ObjectId,
        ref: 'SaleTax',
        required: false
    },
    startTime: Date,
    endTime: Date,
    timeSpent: {
        type: Number,
        default: 0
    },
    timeUpdatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    timeUpdatedAt: {
        type: Date
    },
    equipment_scanned: {
        type: Boolean,
        default: false
    },
    no_of_equipment_scanned: {
        type: Number,
        default: 0
    }

})

export const Job = mongoose.model<IJob>('Job', JobSchema)