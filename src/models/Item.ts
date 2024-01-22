import mongoose, { Document, Schema } from 'mongoose';
import { IPriceTier } from './PriceTier';
import { IJobCosting } from './JobCosting';


export const enum ItemTypes{
    SERVICE='Service',
    PRODUCT='Product'
}
export interface IncomeAccountRef {
    name:string,
    value:string
}
export interface IItem extends Document {
    IncomeAccountRef: any;

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
    costing?: {
        tier: Schema.Types.ObjectId | IJobCosting
        charge?: number
        updatedBy?: Schema.Types.ObjectId
        updatedAt?: Date
    }[]
    isDiscountItem: boolean
    isJobType: boolean
    jobType?: Schema.Types.ObjectId
    company?: Schema.Types.ObjectId
    isActive: boolean
    itemType:ItemTypes,
    salePrice:number,
    productCost:number,
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
    costing: [{
        _id: false,
        tier: {
            type: Schema.Types.ObjectId,
            ref: 'JobCosting'
        },
        charge: Number,
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedAt: Date
    }],
    isDiscountItem: {
        type: Boolean,
        default: false
    },
    isJobType: {
        type: Boolean,
        default: true
    },
    jobType: {
        type: Schema.Types.ObjectId,
        ref: 'JobType',
    },
    itemType:{
        type:String,
        enum : ['Service','Product'],

        default:'Service'
    },
    productCost:{
        type:Number,
        optional:true
    },
    IncomeAccountRef:{
        value:{
            type:String,
            optional:true
        },
        name:{
            type:String,
            optional:true

        }
    },
    
    salePrice:{
        type:Number,
        optional:true
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
);

//Indexes
ItemSchema.index({ company: 1, isActive: 1 });
ItemSchema.index({ company: 1, isActive: 1 });
ItemSchema.index({ company: 1, name: 1 });
ItemSchema.index({ company: 1, isActive: 1, isDiscountItem: 1 });
ItemSchema.index({ jobType: 1 });

export const Item = mongoose.model<IItem>('Item', ItemSchema);