import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyHomeOwner extends Document {

    company: Schema.Types.ObjectId
    homeOwner: Schema.Types.ObjectId | any
    status: number
    isPreferred: boolean
    createdAt: Date
    updatedAt: Date

}

const CompanyHomeOwnerSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    homeOwner: {
        type: Schema.Types.ObjectId,
        ref: 'HomeOwner',
        required: true
    },
    status: {
        type: Number,
        default: 1
    },
    isPreferred: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

export const CompanyHomeOwner = mongoose.model<ICompanyHomeOwner>('CompanyHomeOwner', CompanyHomeOwnerSchema);
