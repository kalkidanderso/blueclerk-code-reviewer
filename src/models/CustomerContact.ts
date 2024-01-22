import mongoose, { Document, Schema } from 'mongoose';
import { User, IUser} from './User';
import { IContact } from '../common/contact';
import { IItem } from './Item';
import { IPriceTier } from './PriceTier';
import { IJobLocation } from './JobLocation';
import { IPaymentTerm } from './PaymentTerm';
import { ICustomer } from './Customer';

export interface ICustomerContact extends IUser {

    isActive: boolean
    info:{
        email: string
    }
    contactName: string
    company: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    equipments: [Schema.Types.ObjectId]
    jobLocations: [Schema.Types.ObjectId | IJobLocation]
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
    inactiveBy?: Schema.Types.ObjectId | IUser,

}

const CustomerContactSchema = new Schema({

    isActive: {type: Boolean, default: true},
    info:{
        email: String
    },
    contactName: {
        type: String,
        required: false
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: false
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: false
    },
    equipments: [{ type: Schema.Types.ObjectId, ref: 'CustomerEquipment' }],
    jobLocations: [{
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
        required: false
    }],
    paymentTerm: {
        type: Schema.Types.ObjectId,
        ref: 'PaymentTerm'
    },
    inactiveAt: {
        type: Date
    },
    inactiveBy: {
        type: String,
        ref: 'User'
    },

});

//Indexes
CustomerContactSchema.index({ company: 1 });
CustomerContactSchema.index({ customer: 1 });
CustomerContactSchema.index({ equipments: 1 });
CustomerContactSchema.index({ jobLocations: 1 });
CustomerContactSchema.index({ paymentTerm: 1 });
CustomerContactSchema.index({ 'info.email': 1 });

export const CustomerContact= User.discriminator<ICustomerContact>('CustomerContact', CustomerContactSchema);
