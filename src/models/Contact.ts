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
        type: String
    }
})





export const Contract = mongoose.model<IContact>('Contact', ContactSchema)