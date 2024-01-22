import mongoose, { Document, Schema } from 'mongoose';

export interface IEstimate extends Document {
    estimateId: string
    items: [{
        part: Schema.Types.ObjectId
        name: string
        itemCode: string
        quantity: number
        cost: number
        tax: number
        taxPercentage: number
        price: number
    }]
    note : string
    status: number
    purchaseOrder: Schema.Types.ObjectId
    total: number
    customer: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date
    invoiceCreated: boolean
    POConverted: boolean
}
const EstimateSchema = new Schema({
    estimateId:{
        type: String,
    },
    items: [{
        part: {
            type: Schema.Types.ObjectId,
            ref: 'Part',
            required: false
        },
        name: {
            type: String,
            required: false
        },
        itemCode: {
            type: String,
            required: false
        },
        quantity: {
            type: Number,
            required: false
        },
        cost: {
            type: Number,
            required: false
        },
        tax: {
            type: Number,
            default: 0
        },
        taxPercentage: {
            type: Number,
            default: 0
        },
        price: {
            type: Number,
            required: false
        }
    }],
    note : {
        type : String,
        required : false
    },
    total: {
        type: Number,
        default: 0
    },
    // 0 => pending
    // 1 => approved by customer
    // 2 => declined/rejected by customer
    status: {
        type: Number,
        default: 1
    },
    purchaseOrder: {
        type: Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: false
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
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
    invoiceCreated:{
        type: Boolean,
        default: false
    },
    POConverted:{
        type: Boolean,
        default: false
    }
});

//Indexes
EstimateSchema.index({ company: 1 });
EstimateSchema.index({ customer: 1 });
EstimateSchema.index({ purchaseOrder: 1 });
EstimateSchema.index({ createdBy: 1 });

export const Estimate = mongoose.model<IEstimate>('Estimate', EstimateSchema);