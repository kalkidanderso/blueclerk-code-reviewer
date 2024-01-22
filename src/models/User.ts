import mongoose, {Document, Schema} from 'mongoose';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { Role, AccountTypes } from '../common/constants';
import bcrypt from 'bcrypt-nodejs';
import moment from 'moment';
import * as Sentry from '@sentry/node';

export interface IUser extends Document {

    accountType?: AccountTypes
    auth: {
        email: string
        password: string
        resetPasswordToken: string
        resetPasswordExpires: Date
        socialId: string
        connectorType: number
    }
    profile: {
        firstName: string
        lastName: string
        displayName: string
        imageUrl: string
    }
    address: {
        street?: string
        unit?: string
        city?: string
        state?: string
        zipCode?: string
    }
    location: {
        type?: 'Point',
        coordinates: number[]
    },
    contact: {
        phone: string
        fax?: string
    }
    permissions: {
        role: Role,
        extra: [string]
    },
    emailPreferences: {
        preferences: number,
        time: Date,
        timeZone: string
    },
    balance: number,
    credit: number,
    commission: number,
    firebaseTokens: {
        token: string,
        createdAt: Date,
        updatedAt: Date
    }[],

    hashPassword: (password: string, next: (err?: any, hash?: string)=>void)=>void
    comparePassword: (password: string, next: (isMatch: boolean)=>void)=>void
    jwt: (req: Request) => string

}

const UserSchema = new Schema({

    accountType: {
        type: Number,
        enum: Object.values(AccountTypes)
    },
    auth: {
        email: { type: String, unique: true },
        password: { type: String },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        socialId: String,
        connectorType: {
            type: Number,
            default: 0
            // 0 for facebook
            // 1 for google
        }
    },
    profile: {
        firstName: String,
        lastName: String,
        displayName: {
            type: String,
            index: 'text'
        },
        imageUrl: String,
    },
    address: {
        street: {
            type: String,
            index: 'text'
        },
        unit: {
            type: String,
            index: 'text'
        },
        city: {
            type: String,
            index: 'text'
        },
        state: {
            type: String,
            index: 'text'
        },
        zipCode: {
            type: String,
            index: 'text'
        },
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false
        }
    },
    contact: {
        phone: String,
        fax: String,
    },
    permissions: {
        role: Number,
        extra: [String],
    },
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
    contacts: [{
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    }],
    balance: {
        type: Number,
        default: 0
    },
    credit: {
        type: Number,
        default: 0
    },
    commission: {
        type: Number,
        default: null
    },
    firebaseTokens: [{
        token: String,
        createdAt: Date,
        updatedAt: Date
    }],
}, { timestamps: { createdAt: true, updatedAt: true } });

UserSchema.pre('save', async function(next) {

    const user = this as IUser;

    if(!user.isModified('auth.password')) {
        return next();
    }

    user.hashPassword(user.auth.password, (err?: any, hash?: string)=>{

        if (err || !hash) return next(err);

        user.auth.password = hash;
        next();

    });

});

UserSchema.methods.hashPassword = function(password: string, next: (err?: any, hash?: string)=>void) {

    const saltRounds = 12;

    try {
        bcrypt.genSalt(
            saltRounds,
            (err, salt) => {

                if (err) return next(err);

                bcrypt.hash(
                    password,
                    salt,
                    undefined,
                    (err: mongoose.Error, hash) => {

                        if (err) return next(err);

                        next(null, hash);

                    }
                );
            }
        );
    } catch (err) {
        Sentry.captureException(err);
        return next(err);
    }

};

UserSchema.methods.comparePassword = function(password: string, next: (isMatch: boolean)=>void) {

    const user = this as IUser;

    bcrypt.compare(
        password,
        user.auth.password,
        (err: mongoose.Error, isMatch: boolean) => {
            next(isMatch);
        }
    );

};

UserSchema.methods.jwt = function(req: Request) {

    const user = this as IUser;
    const token = jwt.sign(
        {
            iss: 'http://api.blueclerk.com',
            id: user._id,
            sessionID: req.sessionID
        },
        process.env.jwt_encryption,
        {
            expiresIn: parseInt(process.env.jwt_expiration)
        }
    );

    return `Bearer ${token}`;

};

//Indexes
UserSchema.index({ contacts: 1 });
UserSchema.index({ 'profile.displayName': 1 });
UserSchema.index({ 'auth.email': 1 });
UserSchema.index({ 'auth.socialId': 1, 'auth.connectorType': 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
