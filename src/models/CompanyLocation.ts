import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from '../models/Company';
import { AssignedVendorSchema, IAssignedVendor } from './AssignedVendor';
import { IWorkType } from './WorkType';

export interface ICompanyLocation extends Document {
    name?: string
    isActive: boolean
    isMainLocation: boolean
    contactName?: string
    info?: {
        companyEmail?: string
        logoUrl?: string
    }
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
    company: Schema.Types.ObjectId | ICompany
    workTypes: [Schema.Types.ObjectId | IWorkType]
    assignedVendors: [IAssignedVendor] | any[]
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
    },
    workTypes: [{ type: Schema.Types.ObjectId, ref: 'WorkType' }],
    assignedVendors: [AssignedVendorSchema]
})

//Indexes
CompanyLocationSchema.index({ company: 1 });
CompanyLocationSchema.index({ workTypes: 1 });
CompanyLocationSchema.index({ company: 1, isActive: 1, isMainLocation: 1 });
CompanyLocationSchema.index({ company: 1, isActive: 1, isMainLocation: 1, _id: -1 });

export const CompanyLocation = mongoose.model<ICompanyLocation>('CompanyLocation', CompanyLocationSchema);
