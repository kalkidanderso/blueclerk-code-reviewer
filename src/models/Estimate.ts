import mongoose, { Document, Schema } from 'mongoose'

export interface IEstimate extends Document {
    
    items: [{
        part: Schema.Types.ObjectId
        name: String
        itemCode: String
        quantity: number
        cost: number
        price: number
    }]
    note : string
    status: number
    purchaseOrder: Schema.Types.ObjectId
    tax: number
    taxPercentage: number
    total: number
    customer: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date
}
const EstimateSchema = new Schema({
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
        price: {
            type: Number,
            required: false
        }
    }],
    note : {
        type : String,
        required : false
    },
    tax: {
        type: Number,
        default: 0
    },
    taxPercentage: {
        type: Number,
        default: 0
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
        ref: 'User',
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
    }
})

export const Estimate = mongoose.model<IEstimate>('Estimate', EstimateSchema)