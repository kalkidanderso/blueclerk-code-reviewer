import mongoose, { Document, Schema } from 'mongoose';

import { IContact } from '../common/contact';


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
    },
    isActive: {
        type: Boolean,
        default: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    smsStatus: {
        type: Boolean,
        default: true, // True = subscribed, False = unsubscribed
    }
}, { timestamps: { createdAt: true, updatedAt: true } });

//Indexes
ContactSchema.index({ userId: 1 });
ContactSchema.index({ name: 1, phone: 1, email: 1});

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
