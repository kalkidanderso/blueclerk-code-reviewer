import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from './Company';
import { IUser } from './User';

// INTERFACE & ENUM

export interface IEmailDefault extends Document {

    subject?: string
    message: string
    company: Schema.Types.ObjectId | ICompany
    createdAt?: Date
    updatedAt?: Date
    updatedBy?: Schema.Types.ObjectId | IUser
    emailType?: EmailTypes

}

export enum EmailTypes {
    INVOICE = 'INVOICE',
    INVOICES = 'INVOICES',
    INCOME_REPORT = 'INCOME_REPORT',
    ACCOUNT_RECEIVABLE_REPORT = 'ACCOUNT_RECEIVABLE_REPORT',
    PO_REQUEST = 'PO_REQUEST',
}

// DEFAULT EMAIL TEMPLATES

export const DefaultEmailTemplate = {
    subject: '{{invoice_number}} from {{company_name}}',
    message: 'Dear {{customer_name}},\n\nPlease see your invoice {{invoice_number}} attached with {{invoice_amount}} due on {{invoice_due_date}}.\n\nThank you for doing business with {{company_name}}\n{{small_company_logo}}'
};

export const DefaultInvoicesEmailTemplate = {
    subject: 'Invoices from {{company_name}}',
    message: 'Dear {{customer_name}},\n\nPlease see your open invoices attached with a total of {{invoice_total_amount}}.\n\nThank you for doing business with {{company_name}}\n{{small_company_logo}}'
};

export const DefaultIncomeReportEmailTemplate = {
    subject: 'Income report of {{company_name}}',
    message: 'Hello,\n\nPlease see your Income Report attached for this period: {{date_range}}.\n\n{{small_company_logo}}'
};

export const DefaultARReportEmailTemplate = {
    subject: 'Account Receivable report of {{company_name}}',
    message: 'Hello,\n\nPlease see your Account Receivable Report attached.\n\n{{small_company_logo}}'
};

export const DefaultPORequestEmailTemplate = {
    subject: '{{type_ticket}} {{ticket_street}} from {{company_name}}',
    message: 'Dear {{customer_name}}, \n\nPlease see the attached {{ticket_id}} for the work requested at {{ticket_street}}. \nWe are not able to schedule the work until the po is received. Pricing subject to change due to items being added at the job site and/or item being heavily damaged. \n\nWe look forward to hearing from you at {{company_name}}\n{{small_company_logo}}'
};

// MONGOOSE SCHEMA

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

);

//Indexes
EmailDefaultSchema.index({ updatedBy: 1 });
EmailDefaultSchema.index({ company: 1, emailType: 1 });

export const EmailDefault = mongoose.model<IEmailDefault>('EmailDefault', EmailDefaultSchema);
