import mongoose, { Document, Schema } from 'mongoose';

export interface IJobCharges extends Document {

    charges: number
    isFixed: boolean
    jobType: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date
    salesTax: Schema.Types.ObjectId
}

const JobChargesSchema = new Schema({

    charges: Number,
    // true for fixed
    // false for hourly
    isFixed: {
        type: Boolean,
        default: true
    },
    jobType: {
        type: Schema.Types.ObjectId,
        ref: 'JobType',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date
    },
    salesTax: {
        type: Schema.Types.ObjectId,
        ref: 'SaleTax',
        required: false
    },

});

//Indexes
JobChargesSchema.index({ jobType: 1 });
JobChargesSchema.index({ company: 1 });
JobChargesSchema.index({ createdBy: 1 });
JobChargesSchema.index({ salesTax: 1 });

export const JobCharges = mongoose.model<IJobCharges>('JobCharges', JobChargesSchema);