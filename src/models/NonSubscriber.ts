import mongoose, { Schema } from 'mongoose';
import { User, IUser } from './User';

export interface INonSubscriber extends IUser {

    subscriber: Schema.Types.ObjectId
    
}

const NonSubscriberSchema = new Schema({

    subscriber: {
        type: Schema.Types.ObjectId,
        ref: 'Subscriber',
        required: true
    }

});

export const NonSubscriber = User.discriminator<INonSubscriber>('NonSubscriber', NonSubscriberSchema);