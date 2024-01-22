import { Schema } from 'mongoose';
import { User, IUser } from './User';

export interface ISubscriber extends IUser {

    company: {
        companyName: string
        industry: Schema.Types.ObjectId
        logoUrl: string
    }
    other: {
        tenantId: string
        hasCardOnFile: boolean
    },
    users: [Schema.Types.ObjectId]
    customers: [Schema.Types.ObjectId]
    
}

const SubscriberSchema = new Schema({

    company: {
        companyName: String,
        industry: { type: Schema.Types.ObjectId, ref: 'Industry' },
        logoUrl: String,
    },
    other: {
        tenantId: String,
        hasCardOnFile: {type: Boolean, default: false}
    },
    users: [{ type: Schema.Types.ObjectId, ref: 'NonSubscriber' }],
    customers: [{ type: Schema.Types.ObjectId, ref: 'Customer' }],

});

export const Subscriber = User.discriminator<ISubscriber>('Subscriber', SubscriberSchema);