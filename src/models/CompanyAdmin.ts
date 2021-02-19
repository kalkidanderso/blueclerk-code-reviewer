import mongoose, { Schema } from 'mongoose'
import { User, IUser } from './User'

export interface ICompanyAdmin extends IUser {

    company: Schema.Types.ObjectId,
    customerEmailPreferences: Number
}

const CompanyAdminSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    customerEmailPreferences: {
        type: Number,
        default: 0
        // 0 for email everytime a job is scheduled
        // 1 for no emails
    }

})

export const CompanyAdmin = User.discriminator<ICompanyAdmin>('CompanyAdmin', CompanyAdminSchema)
