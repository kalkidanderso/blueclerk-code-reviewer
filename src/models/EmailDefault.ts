import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from './Company';
import { IUser } from './User';

export interface IEmailDefault extends Document {

    subject?: string
    message: string
    company: Schema.Types.ObjectId | ICompany
    createdAt?: Date
    updatedAt?: Date
    updatedBy?: Schema.Types.ObjectId | IUser

}

export const DefaultEmailTemplate = {
    subject: '{{invoice_number}} from {{company_name}}',
    message: 'Dear {{customer_name}},\n\nPlease see your invoice {{invoice_number}} attached with {{invoice_amount}} due on {{invoice_due_date}}.\n\nThank you for doing business with {{company_name}}\n{{small_company_logo}}'
  }

const EmailDefaultSchema = new Schema(
    
    {
        subject: String,
        message: {
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
