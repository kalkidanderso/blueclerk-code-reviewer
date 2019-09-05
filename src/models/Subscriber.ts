import { Schema } from 'mongoose'
import { User, IUser } from './User'

export interface ISubscriber extends IUser {

    company: {
        companyName: string
        industry: string
        logoUrl: string
    }
    other: {
        tenantId: string
        hasCardOnFile: boolean
    },
    users: [Schema.Types.ObjectId]
    
}

const SubscriberSchema = new Schema({

    company: {
        companyName: String,
        industry: String,
        logoUrl: String,
    },
    other: {
        tenantId: String,
        hasCardOnFile: {type: Boolean, default: false}
    },
    users: [{ type: Schema.Types.ObjectId, ref: 'NonSubscriber' }],

})

export const Subscriber = User.discriminator<ISubscriber>('Subscriber', SubscriberSchema)