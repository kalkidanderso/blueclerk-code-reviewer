import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { IWorkType } from './WorkType';
import { ICompanyLocation } from './CompanyLocation';

export interface IAdvancePayment extends Document {
    company: Schema.Types.ObjectId | ICompany
    amount: number
    balance: number
    referenceNumber: string
    paymentType: string
    paidAt: Date
    appliedAt: Date
    note?: string
    isVoid: boolean
    voidedAt: Date
    createdBy: Schema.Types.ObjectId | IUser
    updatedBy: Schema.Types.ObjectId | IUser
    voidedBy: Schema.Types.ObjectId | IUser
    workType: [Schema.Types.ObjectId | IWorkType]
    companyLocation: [Schema.Types.ObjectId | ICompanyLocation]
}

export interface IAdvancePaymentVendor extends IAdvancePayment {
    contractor?: Schema.Types.ObjectId | ICompany
}

export interface IAdvancePaymentEmployee extends IAdvancePayment {
    employee: Schema.Types.ObjectId | IUser
}

const AdvancePaymentSchema = new Schema({
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    amount: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    referenceNumber: String,
    paymentType: String,
    paidAt: Date,
    appliedAt: Date,
    note: String,
    isVoid: {
        type: Boolean,
        default: false
    },
    voidedAt: Date,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    voidedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    workType: [{
        type: Schema.Types.ObjectId,
        ref: 'WorkType',
    }],
    companyLocation: [{
        type: Schema.Types.ObjectId,
        ref: 'CompanyLocation',
    }],
}, { timestamps: true });

const AdvancePaymentVendorSchema = new Schema({
    contractor: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: false
    }
});

const AdvancePaymentEmployeeSchema = new Schema({
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
});

//Indexes
AdvancePaymentSchema.index({ company: 1 });
AdvancePaymentSchema.index({ contractor: 1 });
AdvancePaymentSchema.index({ employee: 1 });
AdvancePaymentSchema.index({ paidAt: 1 });
AdvancePaymentSchema.index({ is_void: 1, paidAt: 1 });
AdvancePaymentSchema.index({ company: 1, contractor: 1, is_void: 1, paidAt: 1 });
AdvancePaymentSchema.index({ company: 1, contractor: 1, is_void: 1, appliedAt: 1 });
AdvancePaymentSchema.index({ company: 1, employee: 1, is_void: 1, paidAt: 1 });
AdvancePaymentSchema.index({ company: 1, employee: 1, is_void: 1, appliedAt: 1 });

export const AdvancePayment = mongoose.model<IAdvancePayment>('AdvancePayment', AdvancePaymentSchema);
export const AdvancePaymentVendor = AdvancePayment.discriminator<IAdvancePaymentVendor>('AdvancePaymentVendor', AdvancePaymentVendorSchema);
export const AdvancePaymentEmployee = AdvancePayment.discriminator<IAdvancePaymentEmployee>('AdvancePaymentEmployee', AdvancePaymentEmployeeSchema);
