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
    }
    profile: {
        firstName: string
        lastName: string    
        displayName: string
        avatarUrl: string
    }
    address: {
        street: string
        city: string
        state: string
        zipCode: string
    }
    contact: {
        phone: string
    }
    permissions: {
        role: Role,
        extra: [string]
    }

    comparePassword: (password: string, next: (isMatch: boolean)=>void)=>void
    jwt: ()=>string

}

const UserSchema = new Schema({

    auth: {
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        resetPasswordToken: String,
        resetPasswordExpires: Date,   
    },
    profile: {
        firstName: String,
        lastName: String,    
        displayName: String,
        avatarUrl: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    contact: {
        phone: String,
    },
    permissions: {
        role: Number,
        extra: [String],
    }

})

UserSchema.pre('save', async function(next) {

    const user = this as IUser
    const saltRounds = 12

    if(!user.isModified('auth.password')) {
        return next()
    }

    try {
        bcrypt.genSalt(
            saltRounds, 
            (err, salt) => {

                if (err) return next(err) 

                bcrypt.hash(
                    user.auth.password, 
                    salt, 
                    undefined, 
                    (err: mongoose.Error, hash) => {

                        if (err) return next(err)

                        user.auth.password = hash
                        next()

                    }
                )
            }
        )
    } catch (err) {
        return next(err)
    }

})

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