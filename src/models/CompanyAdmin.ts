import mongoose, { Schema } from 'mongoose'
import { User, IUser } from './User'

export interface ICompanyAdmin extends IUser {

    company: Schema.Types.ObjectId
}

const CompanyAdminSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }

})

export const CompanyAdmin = User.discriminator<ICompanyAdmin>('CompanyAdmin', CompanyAdminSchema)