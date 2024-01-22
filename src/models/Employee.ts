import mongoose, { Schema } from 'mongoose';
import { User, IUser } from './User';

export interface IEmployee extends IUser {

    company: Schema.Types.ObjectId
    status: number,
    extraPermissions: {
        on:[number],
        off: [number]
    },
    agreed: boolean
    canAccessAllLocations: boolean;
}

const EmployeeSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    status: {
        type: Number,
        default: 1
    },
    extraPermissions: {
        on:[Number],
        off: [Number]
    },
    agreed: {
        type: Boolean,
        default: false
    },
    canAccessAllLocations: {
        type: Boolean,
        default: false
    }

});

//Indexes
EmployeeSchema.index({ company: 1 });

export const Employee = User.discriminator<IEmployee>('Employee', EmployeeSchema);
