import mongoose, { Document, Schema } from 'mongoose';
import { ISupplierAdmin } from '../models/CompanyAdmin';

export interface ISupplier extends Document {
    info: {
        name: string
        email?: string
        logoUrl?: string
    },
    address?: {
        street?: string
        unit?: string
        city?: string
        state?: string
        zipCode?: string
    }
    contact?: {
        phone?: string
        fax?: string
    }
    admin: Schema.Types.ObjectId | ISupplierAdmin
}

const SupplierSchema = new Schema({
    info: {
        name: String,
        email: String,
        logoUrl: String
    },
    address: {
        street: String,
        unit: String,
        city: String,
        state: String,
        zipCode: String
    },
    contact: {
        phone: String,
        fax: String
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'SupplierAdmin'
    }
}, { timestamps: true });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
