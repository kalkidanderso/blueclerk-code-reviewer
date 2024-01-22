import mongoose, { Schema } from 'mongoose';
import { User, IUser } from './User';

export interface ICustomerAdmin extends IUser {

    isActive: boolean
    customer: Schema.Types.ObjectId
    info: {
        email: string
    }
}

const CustomerAdminSchema = new Schema({

    isActive: { type: Boolean, default: true },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    info: {
        email: String
    },
});

export const CustomerAdmin = User.discriminator<ICustomerAdmin>('CustomerAdmin', CustomerAdminSchema);
