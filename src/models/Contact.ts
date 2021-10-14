import mongoose, { Document, Schema } from 'mongoose'

import { IContact } from '../common/contact'


const ContactSchema = new Schema({
    name: {
        type: String
    },
    phone: {
        type: String
    },
    email: {
        type: String,
        // unique: true,
        // index: true,
    }
}, { timestamps: { createdAt: true, updatedAt: true } })

export const Contact = mongoose.model<IContact>('Contact', ContactSchema)
