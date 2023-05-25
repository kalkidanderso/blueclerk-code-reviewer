import mongoose, { Document, Schema } from 'mongoose';
import { IJobLocation } from '../models/JobLocation';
import moment from 'moment';
import { IJobSite } from './JobSite';

export interface IHomeOwner extends Document {

    profile: {
        firstName: string
        lastName?: string
        displayName: string
        imageUrl?: string
    }
    info?: {
        email?: string
    }
    contact?: {
        phone?: string
        fax?: string
    }
    subdivision: [Schema.Types.ObjectId | IJobLocation]
    address: [Schema.Types.ObjectId | IJobSite]
    createdAt: Date
    updatedAt: Date

}

const HomeOwnerSchema = new Schema({

    profile: {
        firstName: {
            type: String,
            required: true
        },
        lastName: String,
        displayName: String,
        imageUrl: String
    },
    info: {
        email: String,
    },
    contact: {
        phone: String,
        fax: String
    },
    subdivision: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'JobSite',
    },

}, { timestamps: true });

export const HomeOwner = mongoose.model<IHomeOwner>('HomeOwner', HomeOwnerSchema);
