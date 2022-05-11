import mongoose, { Document, Schema } from 'mongoose'

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

})

export const CompanyCustomer = mongoose.model<ICompanyCustomer>('CompanyCustomer', CompanyCustomerSchema)
