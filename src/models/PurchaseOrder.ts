import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseOrder extends Document {
    purchaseOrderId: string
    items: [{
        part: Schema.Types.ObjectId
        name: string
        ItemCode: string
        quantity: number
        tax: number
        taxPercentage:number
        cost: number
        price: number
    }]
    equipment: Schema.Types.ObjectId
    status: number
    estimate: Schema.Types.ObjectId
    note: string
    total: number
    job: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date
    invoiceCreated: boolean
    estimateConverted: boolean
}
const PurchaseOrderSchema = new Schema({
    purchaseOrderId: {
        type: String
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
    },
    total: {
        type: Number
    },
    estimate:{
        type: Schema.Types.ObjectId,
        ref: 'Estimate',
        required: false
    },
    equipment:{
        type: Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        required: false
    },
    // 0 => pending
    // 1 => approved by customer
    // 2 => declined/rejected by customer
    status: {
        type: Number,
        default: 1
    },
    job: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
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
    estimateConverted: {
        type: Boolean,
        default: false
    }
});

//Indexes
PurchaseOrderSchema.index({ estimate: 1 });
PurchaseOrderSchema.index({ equipment: 1 });
PurchaseOrderSchema.index({ job: 1 });
PurchaseOrderSchema.index({ customer: 1 });
PurchaseOrderSchema.index({ company: 1 });
PurchaseOrderSchema.index({ createdBy: 1 });
PurchaseOrderSchema.index({ estimate: 1, company: 1 });
PurchaseOrderSchema.index({ company: 1, equipment: 1 });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
