import { Schema } from 'mongoose';
import { User, IUser } from './User';

// COMPANY ADMIN DISCRIMINATOR
export interface ICompanyAdmin extends IUser {

    company: Schema.Types.ObjectId
}

const CompanyAdminSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }

});

// SUPPLIER ADMIN DISCRIMINATOR
export interface ISupplierAdmin extends IUser {

    supplier: Schema.Types.ObjectId

}

const SupplierAdminSchema = new Schema({

    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    }

});

export const CompanyAdmin = User.discriminator<ICompanyAdmin>('CompanyAdmin', CompanyAdminSchema);

export const SupplierAdmin = User.discriminator<ISupplierAdmin>('SupplierAdmin', SupplierAdminSchema);
