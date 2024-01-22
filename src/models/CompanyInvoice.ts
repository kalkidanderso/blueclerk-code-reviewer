import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from '../models/Company';

export interface ICompanyInvoice extends Document {
    technicians: number;
    managers: number;
    officeAdmins: number;
    admins: number;
    contractors: number;
    company: Schema.Types.ObjectId | ICompany;
    note : string;
    charges: number;
    tax: number;
    total: number;
    isDraft: boolean;
    stripeId?: string;
    stripeHostedInvoiceUrl?: string;
    stripeInvoicePdf?: string;
    paid: boolean;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    emailHistory: any[];
}

const CompanyInvoiceSchema = new Schema({

    technicians: {
        type: Number,
        default: '0',
        required: false
    },
    managers: {
        type: Number,
        default: '0',
        required: false
    },
    officeAdmins: {
        type: Number,
        default: '0',
        required: false
    },
    admins: {
        type: Number,
        default: '0',
        required: false
    },
    contractors: {
        type: Number,
        default: '0',
        required: false
    },
    charges: {
        type: Number,
        default: '0',
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: '0',
        required: true
    },
    isDraft: {
        type: Boolean,
        default: false
    },
    stripeId: String,
    stripeHostedInvoiceUrl: String,
    stripeInvoicePdf: String,
    paid: {
        type: Boolean,
        default: false
    },
    paidAt: Date,
    note: {
        type: String,
        required: false
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    emailHistory: [{
        sentTo: String,
        sentAt: {
            type: Date,
            default: Date.now
        }
    }],
}, { timestamps: { createdAt: true, updatedAt: true } });

//Indexes
CompanyInvoiceSchema.index({ company: 1 });
CompanyInvoiceSchema.index({ isDraft: 1 });

export const CompanyInvoice = mongoose.model<ICompanyInvoice>('CompanyInvoice', CompanyInvoiceSchema);
