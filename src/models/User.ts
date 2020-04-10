import mongoose, { Document, Schema } from 'mongoose'
import jwt from 'jsonwebtoken'
import { Role } from '../common/constants'
import bcrypt from "bcrypt-nodejs"

export interface IUser extends Document {

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
        street: string
        city: string
        state: string
        zipCode: string
    }
    contact: {
        phone: string
        fax: string
    }
    permissions: {
        role: Role,
        extra: [string]
    }

    hashPassword: (password: string, next: (err?: any, hash?: string)=>void)=>void
    comparePassword: (password: string, next: (isMatch: boolean)=>void)=>void
    jwt: ()=>string

}

const UserSchema = new Schema({

    auth: {
        email: { type: String },
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
        displayName: String,
        imageUrl: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    contact: {
        phone: String,
        fax: String,
    },
    permissions: {
        role: Number,
        extra: [String],
    }

})

UserSchema.pre('save', async function(next) {

    const user = this as IUser

    if(!user.isModified('auth.password')) {
        return next()
    }

    user.hashPassword(user.auth.password, (err?: any, hash?: string)=>{

        if (err || !hash) return next(err) 

        user.auth.password = hash
        next()

    })

})

UserSchema.methods.hashPassword = function(password: string, next: (err?: any, hash?: string)=>void) {

    const saltRounds = 12

    try {
        bcrypt.genSalt(
            saltRounds, 
            (err, salt) => {

                if (err) return next(err) 

                bcrypt.hash(
                    password, 
                    salt, 
                    undefined, 
                    (err: mongoose.Error, hash) => {

                        if (err) return next(err)

                        next(null, hash)

                    }
                )
            }
        )
    } catch (err) {
        return next(err)
    }

}

UserSchema.methods.comparePassword = function(password: string, next: (isMatch: boolean)=>void) {
    
    const user = this as IUser

    bcrypt.compare(
        password, 
        user.auth.password, 
        (err: mongoose.Error, isMatch: boolean) => {
            next(isMatch)
        }
    )

}

UserSchema.methods.jwt = function() {

    const user = this as IUser

    const token = jwt.sign(
        {
            iss: "http://api.blueclerk.com",
            id: user._id,
        }, 
        process.env.jwt_encryption, 
        { 
            expiresIn: parseInt(process.env.jwt_expiration) 
        }
    )

    return `Bearer ${token}`

}

export const User = mongoose.model<IUser>('User', UserSchema)