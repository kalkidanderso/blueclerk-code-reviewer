import mongoose, { Document, Schema } from 'mongoose';

export interface ICommissionHistory extends Document {
    technicianOrContractor: string 
    type:string
    commission: number
    commissionType: string
    editedBy: {
        id: string
        displayName: string
    }
    effectiveDate: Date
    createdAt: Date
    updatedAt: Date
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

}, { timestamps: { createdAt: true, updatedAt: true } })

//Indexes
CommissionHistorySchema.index({ effectiveDate: 1 });

export const CommissionHistory = mongoose.model<ICommissionHistory>('CommissionHistory', CommissionHistorySchema);
