import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { ICompany } from './Company';
import { IJob } from './Job';

export interface IJobCommission extends Document {
    job: Schema.Types.ObjectId | IJob
    technicians: IJobCommissionTechnician[]
    createdAt: Date
    updatedAt: Date
}

export interface IJobCommissionTechnician {
    technician: Schema.Types.ObjectId | IUser
    contractor?: Schema.Types.ObjectId | ICompany
    commission: number
    commissionAmount: number
    paid?: boolean
    paidAt?: Date
}

const JobCommissionSchema = new Schema({
    job: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    technicians: [{
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
        commission: {
            type: Number,
            default: null
        },
        commissionAmount: {
            type: Number,
            default: 0
        },
        paid: {
            type: Boolean,
            default: false
        },
        paidAt: Date
    }]
}, { timestamps: { createdAt: true, updatedAt: true } });

//Indexes
JobCommissionSchema.index({ invoice: 1 });

export const JobCommission = mongoose.model<IJobCommission>('JobCommission', JobCommissionSchema);
