import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyCustomer extends Document {

    company: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId | any
    createdAt: Date
    status: number
    isPreferred: boolean

}

const CompanyCustomerSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    status: {
        type: Number,
        default: 1
    },
    isPreferred: {
        type: Boolean,
        default: false
    },
    createdAt: Date

});

//Indexes
CompanyCustomerSchema.index({ company: 1 });
CompanyCustomerSchema.index({ company: 1, customer: 1 });
CompanyCustomerSchema.index({ company: 1, customer: 1, status: 1, isPreferred: 1 });
CompanyCustomerSchema.index({ contacts: 1 });
CompanyCustomerSchema.index({ equipments: 1 });
CompanyCustomerSchema.index({ jobLocations: 1 });
CompanyCustomerSchema.index({ paymentTerm: 1 });

export const CompanyCustomer = mongoose.model<ICompanyCustomer>('CompanyCustomer', CompanyCustomerSchema);
