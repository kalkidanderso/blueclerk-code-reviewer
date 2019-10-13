import mongoose, { Schema } from 'mongoose'
import { User, IUser } from './User'

export interface IEmployee extends IUser {

    company: Schema.Types.ObjectId
    status: Number
    
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
    }

})

export const Employee = User.discriminator<IEmployee>('Employee', EmployeeSchema)