import mongoose, { Document, Schema } from 'mongoose'
import { ICustomer } from '../models/Customer'

export interface IContact extends Document {
    name: string,
    email: string,
    phone: string,
    isActive: boolean,
    customer: Schema.Types.ObjectId | ICustomer
}