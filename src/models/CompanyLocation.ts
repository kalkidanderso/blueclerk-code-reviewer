import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from '../models/Company';

export interface ICompanyLocation extends Document {
    name?: string
    isActive: boolean
    isMainLocation: boolean
    contactName?: string
    info?: {
        companyEmail: string
        logoUrl: string
    }
    address?: {
        street?: string
        unit?: string
        city?: string
        state?: string
        zipCode?: string
    }
    contact?: {
        phone: string
        fax: string
    }
    company: Schema.Types.ObjectId | ICompany
}

const CompanyLocationSchema = new Schema({

    name: String,
    isActive: {
        type: Boolean,
        default: true
    },
    isMainLocation: {
        type: Boolean,
        default: false
    },
    contactName: String,
    info: {
        companyEmail: String,
        logoUrl: String,
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
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }

})

export const CompanyLocation = mongoose.model<ICompanyLocation>('CompanyLocation', CompanyLocationSchema);
