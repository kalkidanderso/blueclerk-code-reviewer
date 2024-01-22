import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from '../models/Company';
import { IUser } from '../models/User';
import { IJob } from '../models/Job';

export interface IJobRoute extends Document {

    company: Schema.Types.ObjectId | ICompany
    scheduleDate: Date
    employeeType?: boolean
    technician?: Schema.Types.ObjectId | IUser
    contractor?: Schema.Types.ObjectId | ICompany
    routes: {
        order: number
        job: Schema.Types.ObjectId | IJob
    }[]
    createdBy?: Schema.Types.ObjectId | IUser
    updatedBy?: Schema.Types.ObjectId | IUser

}

const JobRouteSchema = new Schema(

    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        scheduleDate: {
            type: Date,
            required: true
        },
        employeeType: {
            type: Number,
            required: false
        },
        technician: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        contractor: {
            type: Schema.Types.ObjectId,
            ref: 'Company'
        },
        routes: [{
            _id: false,
            order: {
                type: Number,
                required: true
            },
            job: {
                type: Schema.Types.ObjectId,
                ref: 'Job',
                required: true
            }
        }],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }, {
        timestamps: { createdAt: true, updatedAt: true }
    }

);

//Indexes
JobRouteSchema.index({ company: 1 });
JobRouteSchema.index({ technician: 1 });
JobRouteSchema.index({ contractor: 1 });
JobRouteSchema.index({ createdBy: 1 });
JobRouteSchema.index({ updatedBy: 1 });
JobRouteSchema.index({ company: 1, 'jobs.company': 1, scheduleDate: 1 });
JobRouteSchema.index({ technician: 1, scheduleDate: 1 });
JobRouteSchema.index({ company: 1, employeeType: 1, technician: 1, contractor: 1, 'jobs.company': 1, scheduleDate: 1 });
JobRouteSchema.index({ scheduleDate: 1 });
JobRouteSchema.index({ scheduleDate: -1 });

export const JobRoute = mongoose.model<IJobRoute>('JobRoute', JobRouteSchema);
