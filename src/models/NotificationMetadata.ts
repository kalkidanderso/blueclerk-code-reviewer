import mongoose, { Schema } from 'mongoose';
import { Notification, INotification } from './Notification';

export interface INotificationJob extends INotification {

    metadata: Schema.Types.ObjectId

};

const NotificationJobSchema = new Schema({

    metadata: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    }

});

export const NotificationJob = Notification.discriminator<INotificationJob>('NotificationJob', NotificationJobSchema);
