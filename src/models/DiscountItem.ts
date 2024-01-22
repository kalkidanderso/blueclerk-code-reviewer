import mongoose, { Schema } from 'mongoose';
import { Item, IItem } from '../models/Item';
import { ICustomer } from '../models/Customer';

export interface IDiscountItem extends IItem {

    customer?: Schema.Types.ObjectId | ICustomer
    noOfItems?: number

}

const DiscountItemSchema = new Schema({

    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer'
    },
    noOfItems: Number

});

export const DiscountItem = Item.discriminator<IDiscountItem>('DiscountItem', DiscountItemSchema);
