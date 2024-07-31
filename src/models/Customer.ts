import mongoose, { Document, Schema } from 'mongoose';
import { IUser} from './User';
import { IContact } from '../common/contact';
import { IItem } from '../models/Item';
import { IPriceTier } from '../models/PriceTier';
import { IJobLocation } from '../models/JobLocation';
import { IPaymentTerm } from '../models/PaymentTerm';
import { IJobCosting } from './JobCosting';
import moment from 'moment';
import { Role } from 'src/common/constants';

export enum ECustomerTypes {
    BUILDER = 'Builder',
}

export interface ICustomer extends Document {
    profile: {
        firstName: string
        lastName: string
        displayName: string
        imageUrl: string
    }
    address: {
        street?: string
        unit?: string
        city?: string
        state?: string
        zipCode?: string
    }
    location: {
        type?: 'Point',
        coordinates: number[]
    },
    contact: {
        phone: string
        fax?: string
    }
    permissions: {
        role: Role,
        extra: [string]
    },
    emailPreferences: {
        preferences: number,
        time: Date,
        timeZone: string
    },
    commission: number,
    isActive: boolean
    info?:{
        email?: string
    }
    contactName: string
    equipments: [Schema.Types.ObjectId]
    jobLocations: [Schema.Types.ObjectId | IJobLocation]
    quickbookId: string
    balance: number,
    credit: number,
    itemTier: Schema.Types.ObjectId | IPriceTier
    JobCosting: Schema.Types.ObjectId | IJobCosting
    isCustomPrice?: boolean
    customPrices?: {
        quantity: number,
        price: number
    }[]
    discountPrices?: {
        quantity: number,
        discountItem: Schema.Types.ObjectId | IItem
    }[]
    paymentTerm?: Schema.Types.ObjectId | IPaymentTerm
    vendorId?: string,
    contacts: [Schema.Types.ObjectId | IContact],
    contactEmail: string
    inactiveAt?: Date
    inactiveBy?: Schema.Types.ObjectId | IUser
    admin: Schema.Types.ObjectId | IUser
    isPORequired?: boolean
    notes?: string
    type: ECustomerTypes
    companyId?: Schema.Types.ObjectId
    spCompanyId?: string
}

export interface IQBCustomer {

    Id?: string
    PrimaryEmailAddr: {
        Address: string
    }
    DisplayName: string
    GivenName?: string
    FamilyName?: string
    CompanyName?: string
    BusinessNumber?: string
    PrimaryPhone?: {
        FreeFormNumber?: string
    }
    Active?: boolean
    Job?: boolean
    ParentRef?: {
        value: string
    }
    BillWithParent?: boolean
    Level?: number
    Balance?: number
    BillAddr?: IQBAddress
    ShipAddr?: IQBAddress

}

export interface IQBAddress {
    Line1?: string
    Line2?: string
    City?: string
    CountrySubDivisionCode?: string
    Country?: string
    PostalCode?: string
    Long?: string
    Lat?: string
}

const CustomerSchema = new Schema({

    profile: {
        firstName: String,
        lastName: String,
        displayName: {
            type: String,
            index: 'text'
        },
        imageUrl: String,
    },
    address: {
        street: String,
        unit: String,
        city: String,
        state: String,
        zipCode: String,
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false
        }
    },
    contact: {
        phone: String,
        fax: String,
    },
    permissions: {
        role: Number,
        extra: [String],
    },
    emailPreferences: {
        preferences: {
            type: Number,
            default: 1
            // 0 for email everytime a job is scheduled
            // 1 for once at the specified time
            // 2 no emails
        },
        time: {
            type: Date,
            default: moment().local().hour(18).minute(0o0).second(0o0)
        },
        timeZone: {
            type: String,
            default: 'America/Chicago'
        }

    },
    contacts: [{
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    }],
    balance: {
        type: Number,
        default: 0
    },
    commission: {
        type: Number,
        default: null
    },
    isActive: {type: Boolean, default: true},
    info:{
        email: String,
        required: false
    },
    contactName: {
        type: String,
        required: false
    },
    equipments: [{ type: Schema.Types.ObjectId, ref: 'CustomerEquipment' }],
    jobLocations: [{
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
        required: false
    }],
    quickbookId: {
        type: String,
        default: null
    },
    credit: {
        type: Number,
        default: 0
    },
    itemTier: {
        type: Schema.Types.ObjectId,
        ref: 'PriceTier'
    },
    JobCosting: {
        type: Schema.Types.ObjectId,
        ref: 'JobCosting'
    },
    isCustomPrice: {
        type: Boolean,
        // default: false
    },
    customPrices: [{
        _id: false,
        quantity: {
            type: Number,
            // required: true
        },
        price: {
            type: Number,
            // default: 0,
            // required: true
        }
    }],
    discountPrices: [{
        _id: false,
        quantity: {
            type: Number,
            required: true
        },
        discountItem: {
            type: Schema.Types.ObjectId,
            ref: 'Item'
        }
    }],
    paymentTerm: {
        type: Schema.Types.ObjectId,
        ref: 'PaymentTerm'
    },
    vendorId: {
        type: String,
    },
    inactiveAt: {
        type: Date
    },
    inactiveBy: {
        type: String,
        ref: 'User'
    },
    admin:{
        type: String,
        ref: 'User'
    },
    isPORequired: {
        type: Boolean,
        default: false,
        required: false
    },
    notes: {
        type: String,
    },
    type: {
        type: String,
        enum: Object.values(ECustomerTypes),
        default: ECustomerTypes.BUILDER
    },
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: false
    },
    spCompanyId: {
        type: String,
        required: false,
        select: false
    }
});

//Indexes
CustomerSchema.index({ itemTier: 1 });
CustomerSchema.index({ contacts: 1 });
CustomerSchema.index({ equipments: 1 });
CustomerSchema.index({ jobLocations: 1 });
CustomerSchema.index({ paymentTerm: 1 });
CustomerSchema.index({ isActive: 1 });
CustomerSchema.index({ contactName: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
