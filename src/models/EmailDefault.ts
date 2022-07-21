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
    emailType?: EmailTypes

}

export const DefaultEmailTemplate = {
    subject: '{{invoice_number}} from {{company_name}}',
    message: 'Dear {{customer_name}},\n\nPlease see your invoice {{invoice_number}} attached with {{invoice_amount}} due on {{invoice_due_date}}.\n\nThank you for doing business with {{company_name}}\n{{small_company_logo}}'
}

export const DefaultIncomReportEmailTemplate = {
    subject: 'Income report of {{company_name}}',
    message: 'Hello,\n\nPlease see your Income Report attached for this period: {{date_range}}.'
}

export enum EmailTypes {
    INVOICE = 'INVOICE',
    INCOME_REPORT = 'INCOME_REPORT'
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
        },
        emailType: {
            type: String,
            enum: Object.values(EmailTypes),
            required: true,
        }
    },
    { timestamps: { createdAt: true, updatedAt: true } }

)

export const EmailDefault = mongoose.model<IEmailDefault>('EmailDefault', EmailDefaultSchema);
