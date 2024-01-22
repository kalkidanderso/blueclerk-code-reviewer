import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyPrefix extends Document {

    prefix: string
    maxJobId: number
    company: Schema.Types.ObjectId
}

const CompanyPrefixSchema = new Schema({

    prefix: String,
    maxJobId: Number,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
});

export const CompanyPrefix = mongoose.model<ICompanyPrefix>('CompanyPrefix', CompanyPrefixSchema);