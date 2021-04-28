import mongoose, { Document, Schema } from 'mongoose'

export interface ICompanyInvoice extends Document {
    technicians: number;
    managers: number;
    officeAdmins: number;
    admins: number;
    contractors: number;
    company: Schema.Types.ObjectId;
    note : String;
    charges: number;
    tax: number;
    total: number;
    createdAt: Date;
    emailHistory: any[];
}

const CompanyInvoiceSchema = new Schema({

    technicians: {
        type: Number,
        default: '0',
        required: false
    },
    managers :{
        type: Number,
        default: '0',
        required: false
    },
    officeAdmins :{
        type: Number,
        default: '0',
        required: false
    },
    admins :{
        type: Number,
        default: '0',
        required: false
    },
    contractors :{
        type: Number,
        default: '0',
        required: false
    },
    charges :{
        type: Number,
        default: '0',
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    total :{
        type: Number,
        default: '0',
        required: true
    },
    note: {
        type: String,
        required: false
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    emailHistory: [{
        sentTo: String,
        sentAt: {
            type: Date,
            default: Date.now
        }
    }],
})

export const CompanyInvoice = mongoose.model<ICompanyInvoice>('CompanyInvoice', CompanyInvoiceSchema)
