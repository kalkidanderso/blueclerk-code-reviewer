import mongoose, { Document, Schema } from 'mongoose'

export interface IContact extends Document {
    name: String,
    email: String,
    phone: String
}