import mongoose, { Document, Schema } from 'mongoose'
import { IJobTypes } from './JobType'

export interface IJob extends Document {

    scheduleDate: Date
    scheduledStartTime: Date
    scheduledEndTime: Date
    jobId: string
    parentJob: Schema.Types.ObjectId | IJob
    ticket: Schema.Types.ObjectId | any
    technician: Schema.Types.ObjectId
    contractor: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId | any
    jobLocation: Schema.Types.ObjectId | any
    jobSite: Schema.Types.ObjectId | any
    type: Schema.Types.ObjectId | any // TODO: To be deprecated
    jobTypes: IJobTypes[]
    company: Schema.Types.ObjectId | any
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
    completeOnTime: boolean
    track: {
        user: Schema.Types.ObjectId
        action: string
        note?: string
        date: Date
    }[]
}

const JobSchema = new Schema({

    scheduleDate: {
        type: Date
    },
    scheduledStartTime: {
        type: Date,
        required: false
    },
    scheduledEndTime: {
        type: Date,
        required: false
    },
    jobId: String,
    parentJob: {
        type: Schema.Types.ObjectId,
        ref: 'Job'
    },
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
        required: false
    },
    contractor: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: false
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobLocation: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
    },
    jobSite: {
        type: Schema.Types.ObjectId,
        ref: 'JobSite',
    },
    type: {
        // TODO: To be deprecated
        type: Schema.Types.ObjectId,
        ref: 'JobType',
        // required: true
    },
    jobTypes: [{
        _id: false,
        jobType: {
            type: Schema.Types.ObjectId,
            ref: 'JobType',
            required: true
        }
    }],
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
    track: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        action: String,
        note: String,
        date: Date
    }],
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
    },
    completeOnTime:{
        type: Boolean,
        required: false
    }

})

export const Job = mongoose.model<IJob>('Job', JobSchema)
