import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '../models/User';
import { IJobLocation } from '../models/JobLocation';
import moment from 'moment';

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
    address: {
        street?: string
        unit?: string
        city?: string
        state?: string
        zipCode?: string
    }
    location?: {
        type?: 'Point',
        coordinates: number[]
    }
    jobLocations: [Schema.Types.ObjectId | IJobLocation]
    emailPreferences: {
        preferences: number,
        time: Date,
        timeZone: string
    }
    inactiveAt?: Date
    inactiveBy?: Schema.Types.ObjectId | IUser
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
    address: {
        street: String,
        unit: String,
        city: String,
        state: String,
        zipCode: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number]
        }
    },
    jobLocations: [{
        type: Schema.Types.ObjectId,
        ref: 'JobLocation'
    }],
    emailPreferences: {
        preferences: {
            type: Number,
            default: 1
            // 0 for email everytime a job is scheduled
            // 1 for once at the specified time
            // 2 no emails
        },
        time: {
            type: Date,
            default: moment().local().hour(18).minute(0o0).second(0o0)
        },
        timeZone: {
            type: String,
            default: 'America/Chicago'
        }
    },
    inactiveAt: {
        type: Date
    },
    inactiveBy: {
        type: String,
        ref: 'User'
    }

}, { timestamps: true });

//Indexes
HomeOwnerSchema.index({ jobLocations: 1 });
HomeOwnerSchema.index({ 'profile.firstName': 1, 'profile.lastName': 1, 'profile.displayName': 1, 'address.street': 1, 'address.city': 1 });


export const HomeOwner = mongoose.model<IHomeOwner>('HomeOwner', HomeOwnerSchema);
