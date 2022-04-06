import mongoose, { Document, Schema } from 'mongoose'

export interface IContact extends Document {
    name: string,
    email: string,
    phone: string,
    isActive: boolean,
    referenceNumber: string
}