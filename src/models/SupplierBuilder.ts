import mongoose, { Document, Schema } from 'mongoose';
import { ICustomer } from '../models/Customer';
import { ISupplier } from '../models/Supplier';

export interface ISupplierBuilder extends Document {

    supplier: Schema.Types.ObjectId | ISupplier
    builder: Schema.Types.ObjectId | ICustomer
    status: number
    isActive: boolean
    isPreferred: boolean

}

const SupplierBuilderSchema = new Schema({

    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    builder: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    status: {
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPreferred: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

export const SupplierBuilder = mongoose.model<ISupplierBuilder>('SupplierBuilder', SupplierBuilderSchema);
