import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IJobType, IJobTypes } from './JobType';
import { ICompany } from '../models/Company';
import { IHomeOwner } from '../models/HomeOwner';
import { IJobLocation } from '../models/JobLocation';
import { IJobSite } from '../models/JobSite';
import { IJobCommission } from './JobCommission';
import { IJobCosting } from './JobCosting';

export interface IJob extends Document {
    scheduleTimeAMPM: number
    scheduleDate: Date
    scheduledStartTime: Date
    scheduledEndTime: Date
    jobId: string
    parentJob: Schema.Types.ObjectId | IJob
    ticket: Schema.Types.ObjectId | any
    request: Schema.Types.ObjectId | any
    technician: Schema.Types.ObjectId | any // TODO: To be deprecated
    contractor: Schema.Types.ObjectId // TODO: To be deprecated
    customer: Schema.Types.ObjectId | any
    jobLocation: Schema.Types.ObjectId | any
    jobSite: Schema.Types.ObjectId | any
    isHomeOccupied: boolean
    customerName: Schema.Types.String
    customerEmail?: Schema.Types.String
    customerPhone?: Schema.Types.String
    homeOwner: Schema.Types.ObjectId | IHomeOwner
    homeJobLocation: Schema.Types.ObjectId | IJobLocation
    homeJobSite: Schema.Types.ObjectId | IJobSite
    customerContactId: Schema.Types.ObjectId | any
    customerPO: string
    image?: string
    images?: {
        _id?: Schema.Types.ObjectId
        imageUrl?: string
        uploadedBy?: Schema.Types.ObjectId | IUser
        createdAt?: Date
        updatedAt?: Date
    }[]
    technicianImages?: {
        _id?: Schema.Types.ObjectId
        imageUrl?: string
        uploadedBy?: Schema.Types.ObjectId
        createdAt?: Date
        updatedAt?: Date
    }[]
    type: Schema.Types.ObjectId | any // TODO: To be deprecated
    tasks: ITask[]
    tasksBackup: ITaskJobType[] // TODO: Temporary, to be removed
    company: Schema.Types.ObjectId | any
    equipmentId: string
    description: string
    status: number,
    comment: string
    createdAt: Date,
    updatedAt: Date,
    createdBy: Schema.Types.ObjectId,
    employeeType: boolean // TODO: To be deprecated
    // isFixed: boolean
    // hourlyRate: number
    charges: number
    salesTax: Schema.Types.ObjectId
    startTime: Date
    endTime: Date
    timeSpent: number
    timeUpdatedBy: Schema.Types.ObjectId
    timeUpdatedAt: Date
    equipment_scanned: boolean // TODO: To be deprecated
    no_of_equipment_scanned: number // TODO: To be deprecated
    completeOnTime: boolean
    track: {
        user: Schema.Types.ObjectId
        action: string
        note?: string
        date: Date
    }[]
    commission?: Schema.Types.ObjectId | IJobCommission
    workType: Schema.Types.ObjectId  | any
    companyLocation: Schema.Types.ObjectId  | any
    rescheduled: boolean
}

export interface ITask extends Document {
    status: number
    employeeType?: boolean
    technician?: Schema.Types.ObjectId | any
    contractor?: Schema.Types.ObjectId | ICompany
    contractorCommissionTier?: Schema.Types.ObjectId | IJobCosting
    comment?: string
    isTranslated: boolean;
    jobTypes?: ITaskJobType[]
    paid: boolean
    paidAt: Date
}

export interface TaskEntry {
    status: number
    employeeType: string
    technicianId: string
    contractorId: string
    jobTypes: string[]
}

export interface ITaskJobType extends Document {
    jobType?: Schema.Types.ObjectId | IJobType
    isSelfFinished?: boolean
    status?: number
    charges?: number
    startTime?: Date
    tempStartTime?: Date
    endTime?: Date
    timeSpent?: number
    pausedCount?: number
    timeUpdatedBy?: Schema.Types.ObjectId | IUser
    timeUpdatedAt?: Date
    equipmentScanned?: boolean
    noOfEquipmentScanned?: number
    quantity?: number
    price?: number
    completedCount?: number
    completedComment?: string
    jobCostingQuantity?: number
}

const JobSchema = new Schema({

    scheduleTimeAMPM: {
        type: Number,
        default: 0
    },
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
    jobId: {
        type: String,
        index: 'text'
    },
    parentJob: {
        type: Schema.Types.ObjectId,
        ref: 'Job'
    },
    ticket: {
        type: Schema.Types.ObjectId,
        ref: 'ServiceTicket',
    },
    request: {
        type: Schema.Types.ObjectId,
        ref: 'JobRequest',
    },
    equipmentId: {
        type: Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        required: false
    },
    technician: {
        // TODO: To be deprecated
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    contractor: {
        // TODO: To be deprecated
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: false
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: false,
        index:true
    },
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
    customerContactId: {
        type: Schema.Types.ObjectId,
        ref: 'Contact'
    },
    customerPO: String,
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
        }],
    technicianImages: [{
        imageUrl: {
            type: String,
            required: true
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: Date
    }],
    type: {
        // TODO: To be deprecated
        type: Schema.Types.ObjectId,
        ref: 'JobType',
        // required: true
    },
    tasksBackup: [{
        _id: false,
        jobType: {
            type: Schema.Types.ObjectId,
            ref: 'JobType',
            // required: true
        },
        isSelfFinished: {
            type: Boolean,
            default: false
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
        // completeOnTime: Boolean,
        equipmentScanned: {
            type: Boolean,
            default: false
        },
        noOfEquipmentScanned: {
            type: Number,
            default: 0
        }
    }],
    tasks: [{
        // employee type 0 for company employee
        // employee type 1 for external employee
        status: {
            type: Number,
            default: 0
        },
        employeeType: {
            type: Boolean,
            default: false
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
        contractorCommissionTier: {
            type: Schema.Types.ObjectId,
            ref: 'JobCosting',
            required: false
        },
        comment: String,
        isTranslated: {type: Boolean, default: false},
        jobTypes: [{
            jobType: {
                type: Schema.Types.ObjectId,
                ref: 'JobType',
                // required: true
            },
            isSelfFinished: {
                type: Boolean,
                default: false
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
            // completeOnTime: Boolean,
            equipmentScanned: {
                type: Boolean,
                default: false
            },
            noOfEquipmentScanned: {
                type: Number,
                default: 0
            },
            quantity: {
                type: Number,
                default: 1
            },
            price: {
                type: Number
            },
            completedCount: {
                type: Number
            },
            completedComment: {
                type: String,
            },
            jobCostingQuantity: {
                type: Number
            },
        }],
        paid: {
            type: Boolean,
            default: false
        },
        paidAt: Date
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
    updatedAt: {
        type: Date
    },
    // employee type 0 for company employee
    // employee type 1 for external employee
    employeeType: {
        // TODO: To be deprecated
        type: Boolean,
        // default: false
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
        // TODO: To be deprecated
        type: Boolean,
        // default: false
    },
    no_of_equipment_scanned: {
        // TODO: To be deprecated
        type: Number,
        // default: 0
    },
    completeOnTime: {
        type: Boolean,
        required: false
    },
    commission: {
        type: Schema.Types.ObjectId,
        ref: 'JobCommission',
        required: false
    },
    workType: {
        type: Schema.Types.ObjectId,
        ref: 'WorkType',
    },
    companyLocation: {
        type: Schema.Types.ObjectId,
        ref: 'CompanyLocation',
    },
    rescheduled: {
        type: Boolean,
        default: false,
        required: false
    },
}, { timestamps: { updatedAt: true } });

//Indexes
JobSchema.index({ parentJob: 1 });
JobSchema.index({ employeeType: 1 });
JobSchema.index({ image: 1 });
JobSchema.index({ ticket: 1 });
JobSchema.index({ request: 1 });
JobSchema.index({ equipmentId: 1 });
JobSchema.index({ technician: 1 });
JobSchema.index({ contractor: 1 });
JobSchema.index({ customer: 1 });
JobSchema.index({ jobLocation: 1 });
JobSchema.index({ jobSite: 1 });
JobSchema.index({ homeOwner: 1 });
JobSchema.index({ homeJobLocation: 1 });
JobSchema.index({ homeJobSite: 1 });
JobSchema.index({ customerContactId: 1 });
JobSchema.index({ company: 1, 'tasks.technician': 1});
JobSchema.index({'tasks.contractor': 1});
JobSchema.index({ 'tasks.technician': 1, technician: 1});
JobSchema.index({ contractor: 1, 'tasks.contractor': 1, company: 1, customer: 1});
JobSchema.index({ contractor: 1, 'tasks.contractor': 1, company: 1, updatedAt: -1 });
JobSchema.index({ contractor: 1, 'tasks.contractor': 1, company: 1, scheduleDate: 1, customer: 1});
JobSchema.index({ contractor: 1, 'tasks.contractor': 1, company: 1, scheduleDate: 1, customer: 1, jobId: 1});
JobSchema.index({ contractor: 1, 'tasks.contractor': 1, company: 1, scheduleDate: 1, customer: 1, jobId: 1, _id: -1});


export const Job = mongoose.model<IJob>('Job', JobSchema);
