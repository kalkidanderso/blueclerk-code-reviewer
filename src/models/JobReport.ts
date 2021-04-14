import mongoose, { Document, Schema } from 'mongoose'
import {PurchaseOrder} from './PurchaseOrder';

export interface IJobReport extends Document {
    job: Schema.Types.ObjectId | any;
    scans: [Schema.Types.ObjectId] | any[];
    PurchaseOrder: [Schema.Types.ObjectId] | any[];
    company: Schema.Types.ObjectId | any;
    contractor: Schema.Types.ObjectId | any;
    customerName: string;
    technicianName: string;
    jobDate: Date | any;
    emailHistory: any[];
    createdAt: Date;
    lastEmailSent: Date;
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
    }
});

export const JobReport = mongoose.model<IJobReport>('JobReport', JobReportSchema)
