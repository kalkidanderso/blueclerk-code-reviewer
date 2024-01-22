import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { ICompany } from './Company';

export interface IPriceTier extends Document {

    companyId: Schema.Types.ObjectId | ICompany
    name: string
    isActive: boolean
    inactiveBy?: Schema.Types.ObjectId | IUser
    inactiveAt?: Date
    createdAt: Date
    updatedAt: Date

}

const PriceTierSchema = new Schema(

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

//Indexes
PriceTierSchema.index({ companyId: 1 });
PriceTierSchema.index({ inactiveBy: 1 });

export const PriceTier = mongoose.model<IPriceTier>('PriceTier', PriceTierSchema);