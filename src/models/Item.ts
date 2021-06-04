import mongoose, { Document, Schema } from 'mongoose'
import { IPriceTier } from './PriceTier';

export interface IItem extends Document {

    name: string
    isFixed: boolean
    charges: number
    tax: number
    tiers: {
        tier: Schema.Types.ObjectId | IPriceTier
        charge?: number
        updatedBy?: Schema.Types.ObjectId
        updatedAt?: Date
    }[]
    jobType: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    isActive: boolean
}

const ItemSchema = new Schema({

    name: String,
    // hourly fixed
    isFixed: {
        type: Boolean,
        default: true
    },
    charges: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    tiers: [{
        _id: false,
        tier: {
            type: Schema.Types.ObjectId,
            ref: 'PriceTier'
        },
        charge: Number,
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedAt: Date
    }],
    jobType: {
        type: Schema.Types.ObjectId,
        ref: 'JobType',
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
    },
    isActive:{
        type: Boolean,
        default: true
    }

})

export const Item = mongoose.model<IItem>('Item', ItemSchema)