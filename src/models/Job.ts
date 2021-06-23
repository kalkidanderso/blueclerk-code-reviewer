import mongoose, { Document, Schema } from 'mongoose'
import { IUser } from './User'
import { IJobType, IJobTypes } from './JobType'

export interface IJob extends Document {

    scheduleDate: Date
    scheduledStartTime: Date
    scheduledEndTime: Date
    jobId: string
    parentJob: Schema.Types.ObjectId | IJob
    ticket: Schema.Types.ObjectId | any
    technician: Schema.Types.ObjectId | any
    contractor: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId | any
    jobLocation: Schema.Types.ObjectId | any
    jobSite: Schema.Types.ObjectId | any
    type: Schema.Types.ObjectId | any // TODO: To be deprecated
    tasks: {
        jobType: Schema.Types.ObjectId | IJobType
        status?: number
        charges?: number
        startTime?: Date
        tempStartTime?: Date
        endTime?: Date
        timeSpent?: number
        pausedCount?: number
        timeUpdatedBy?: Schema.Types.ObjectId | IUser
        timeUpdatedAt?: Date
        completeOnTime?: boolean
        equipmentScanned?: boolean
        noOfEquipmentScanned?: number
    }[]
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
    startTime: Date // TODO: To be deprecated
    endTime: Date // TODO: To be deprecated
    timeSpent: number // TODO: To be deprecated
    timeUpdatedBy: Schema.Types.ObjectId // TODO: To be deprecated
    timeUpdatedAt: Date // TODO: To be deprecated
    equipment_scanned: boolean // TODO: To be deprecated
    no_of_equipment_scanned: number // TODO: To be deprecated
    completeOnTime: boolean // TODO: To be deprecated
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
    tasks: [{
        _id: false,
        jobType: {
            type: Schema.Types.ObjectId,
            ref: 'JobType',
            required: true
        },
        status: {
            type: Number,
            default: 0
        },
        charges: {
            type: Number,
            default: 0
        },
        startTime: Date,
        tempStartTime: Date,
        endTime: Date,
        timeSpent: {
            type: Number,
            default: 0
        },
        pausedCount: {
            type: Number,
            default: 0
        },
        timeUpdatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        timeUpdatedAt: Date,
        completeOnTime: Boolean,
        equipmentScanned: {
            type: Boolean,
            default: false
        },
        noOfEquipmentScanned: {
            type: Number,
            default: 0
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
    startTime: Date, // TODO: To be deprecated
    endTime: Date, // TODO: To be deprecated
    timeSpent: {
        // TODO: To be deprecated
        type: Number,
        // default: 0
    },
    timeUpdatedBy: {
        // TODO: To be deprecated
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    timeUpdatedAt: {
        // TODO: To be deprecated
        type: Date
    },
    equipment_scanned: {
        // TODO: To be deprecated
        type: Boolean,
        // default: false
    },
    no_of_equipment_scanned: {
        // TODO: To be deprecated
        type: Number,
        // default: 0
    },
    completeOnTime:{
        // TODO: To be deprecated
        type: Boolean,
        required: false
    }

})

export const Job = mongoose.model<IJob>('Job', JobSchema)
