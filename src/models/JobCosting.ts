import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { ICompany } from './Company';
export interface IJobCosting extends Document {
    companyId: Schema.Types.ObjectId | ICompany
    name: string
    isActive: boolean
    inactiveBy?: Schema.Types.ObjectId | IUser
    inactiveAt?: Date
    createdAt: Date
    updatedAt: Date
}
const JobCostingSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company'
        },
        name: {
            type: String,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        inactiveBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        inactiveAt: Date
    },
    { timestamps: { createdAt: true, updatedAt: true } }
);
export const JobCosting = mongoose.model<IJobCosting>('JobCosting', JobCostingSchema);