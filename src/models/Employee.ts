import mongoose, { Schema } from 'mongoose'
import { User, IUser } from './User'

export interface IEmployee extends IUser {

    company: Schema.Types.ObjectId
    status: Number,
    extraPermissions: {
        on:[number],
        off: [number]
    },
    agreed: boolean,
    emailPreferences: Number

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
    emailPreferences: {
        type: Number,
        default: 0
        // 0 for email everytime a job is scheduled
        // 1 for once a day at night
        // 2 no emails
    },

})

export const Employee = User.discriminator<IEmployee>('Employee', EmployeeSchema)
