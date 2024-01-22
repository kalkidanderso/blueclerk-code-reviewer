import mongoose, { Document, Schema } from 'mongoose';
import { IInvoice } from './Invoice';
import {PurchaseOrder} from './PurchaseOrder';

export interface IJobReport extends Document {
    job: Schema.Types.ObjectId | any;
    scans: [Schema.Types.ObjectId] | any[];
    PurchaseOrder: [Schema.Types.ObjectId] | any[];
    company: Schema.Types.ObjectId | any;
    // To be deprecated
    contractor: Schema.Types.ObjectId | any;
    customerName: string;
    // To be deprecated
    technicianName: string;
    jobDate: Date | any;
    emailHistory: any[];
    createdAt: Date;
    lastEmailSent: Date;
    invoiceCreated?: boolean;
    invoiceVoid?: boolean;
    invoice?: Schema.Types.ObjectId | IInvoice;
}

const JobReportSchema = new Schema({
    job: {
        type: Schema.Types.ObjectId,
        ref: 'Job'
    },
    scans: [{
        type: Schema.Types.ObjectId,
        ref: 'Scan',
        required: false
    }],
    customerName: {
        type: String,
        required: false
    },
    technicianName: {
        type: String,
        required: false
    },
    jobDate: {
        type: Date,
        required: false
    },
    purchaseOrders: [{
        type: Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: false
    }],
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    },
    contractor: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    },
    emailHistory: [{
        sentTo: String,
        sentAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastEmailSent: {
        type: Date,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    invoiceCreated: {
        type: Boolean
    },
    invoiceVoid: {
        type: Boolean
    },
    invoice: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice'
    }
});

//Indexes
JobReportSchema.index({ job: 1 });
JobReportSchema.index({ scans: 1 });
JobReportSchema.index({ purchaseOrders: 1 });
JobReportSchema.index({ company: 1 });
JobReportSchema.index({ contractor: 1 });
JobReportSchema.index({ invoice: 1 });

export const JobReport = mongoose.model<IJobReport>('JobReport', JobReportSchema);
