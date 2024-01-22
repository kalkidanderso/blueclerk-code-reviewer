import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from '../models/Company';
import { IUser } from '../models/User';

export interface IContract extends Document {

    company: Schema.Types.ObjectId | any
    contractor: Schema.Types.ObjectId | ICompany
    contractorEmail: string // Used when inviting new contractor before they signed up
    status: number
    createdBy: Schema.Types.ObjectId | IUser
    finishedBy: Schema.Types.ObjectId | IUser
    finishedAt: Date
    extraPermissions: [number]
    createdAt: Date
    updatedAt: Date

}

const ContractSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    contractor: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
    },
    contractorEmail: String,
    status: { type: Number, default: 0 }, // 0 for pending 1 For Active 2 For disabled
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    finishedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    finishedAt: Date,
    extraPermissions: [Number]

}, { timestamps: { createdAt: true, updatedAt: true } });

//Indexes
ContractSchema.index({ company: 1 });
ContractSchema.index({ contractor: 1 });
ContractSchema.index({ createdBy: 1 });
ContractSchema.index({ finishedBy: 1 });

export const Contract = mongoose.model<IContract>('Contract', ContractSchema);
