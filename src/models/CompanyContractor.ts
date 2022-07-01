import mongoose, { Schema } from 'mongoose'
import { User, IUser } from './User'

export interface ICompanyContractor extends IUser {

    company: Schema.Types.ObjectId
}

const CompanyContractorSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }

})

export const CompanyContractor = User.discriminator<ICompanyContractor>('CompanyContractor', CompanyContractorSchema)
