import mongoose, { Document, Schema } from 'mongoose'
import { IPriceTier } from './PriceTier';

export interface IItem extends Document {

    name: string
    description: string
    sku: string
    isFixed: boolean
    charges?: number
    tax: number
    tiers?: {
        tier: Schema.Types.ObjectId | IPriceTier
        charge?: number
        updatedBy?: Schema.Types.ObjectId
        updatedAt?: Date
    }[]
    jobType?: Schema.Types.ObjectId
    company?: Schema.Types.ObjectId
    isActive: boolean
    quickbookId?: string
    createdAt?: Date
    updatedAt?: Date

}

export const enum QBItemTypes {
    INVENTORY = 'Inventory',
    SERVICE = 'Service',
    NONINVENTORY = 'NonInventory'
}

export interface IQBItem {

    Id?: string
    Name: string
    Type?: QBItemTypes
    Active?: boolean
    Description?: string
    ItemCategoryType?: string
    Sku?: string
    InvStartDate?: Date
    FullyQualifiedName?: string
    Taxable?: boolean
    QtyOnHand?: number
    UnitPrice?: number
    SalesTaxIncluded?: boolean
    IncomeAccountRef?: {
        value: string
        name: string
    }
    PurchaseCost?: number
    TrackQtyOnHand?: boolean
    domain?: string
    sparse?: boolean
    SyncToken?: string
    MetaData?: {
        CreateTime: Date
        LastUpdatedTime: Date
    }

}

const ItemSchema = new Schema({

    name: String,
    description: String,
    sku: String,
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
    },
    quickbookId: String

}, { timestamps: { createdAt: true, updatedAt: true } }
)

export const Item = mongoose.model<IItem>('Item', ItemSchema)