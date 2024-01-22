import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '../models/User';

export interface IContact extends Document {
    name: string,
    email: string,
    phone: string,
    isActive: boolean,
    userId: Schema.Types.ObjectId | IUser,
    smsStatus: boolean,
}