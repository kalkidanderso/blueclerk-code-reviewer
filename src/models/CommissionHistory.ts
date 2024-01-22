import mongoose, { Document, Schema } from 'mongoose';

export interface ICommissionHistory extends Document {
    technicianOrContractor: string 
    type:string
    commission: number
    addition?: {
        amount: number
        note: string
    };
    deduction?: {
        amount: number
        note: string
    };
    commissionType: string
    editedBy: {
        id: string
        displayName: string
    }
    effectiveDate: Date
    createdAt: Date
    updatedAt: Date
    job: string 
}

const CommissionHistorySchema = new Schema({

    technicianOrContractor: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'onCollection',
    },
    onCollection: {
        type: String,
        required: false,
        enum: ['User', 'Company']
    },
    type: {
        type: String,
        required: true 
    },
    effectiveDate: {
        type: Date,
        default: null,
    },
    commission: {
        type: Number,
        default: null,
    },
    addition: {
        amount: Number,
        note: String,
    },
    deduction: {
        amount: Number,
        note: String,
    },
    commissionType: {
        type: String,
        default: null,
    },
    editedBy: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        displayName: String,
    },
    job: { type: Schema.Types.ObjectId, ref: 'Job' },

}, { timestamps: { createdAt: true, updatedAt: true } });

//Indexes
CommissionHistorySchema.index({ effectiveDate: 1 });

export const CommissionHistory = mongoose.model<ICommissionHistory>('CommissionHistory', CommissionHistorySchema);
