import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from './Company';
import { IUser } from './User';

export interface IEmailDefault extends Document {

    subject?: string
    body: string
    company: Schema.Types.ObjectId | ICompany
    createdAt?: Date
    updatedAt?: Date
    updatedBy?: Schema.Types.ObjectId | IUser

}

export const DefaultEmailTemplate = {
    subject: '{Job Report/Invoice #12345} from',
    body: `Dear {customer},\n\nPlease see your {job report/invoice #12345} attached with {$ 0} due on {receipt/net15/net30 terms date}.\n\n{PDF attachment}\n\nThank you for doing business with {company name}.\n\n{Company logo}`
}

const EmailDefaultSchema = new Schema(
    
    {
        subject: String,
        body: {
            type: String,
            required: true
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    { timestamps: { createdAt: true, updatedAt: true } }
    
)

export const EmailDefault = mongoose.model<IEmailDefault>('EmailDefault', EmailDefaultSchema);
