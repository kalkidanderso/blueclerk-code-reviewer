import mongoose, { Schema } from 'mongoose';
import { Notification, INotification } from './Notification';

export interface INotificationContract extends INotification {

    metadata: Schema.Types.ObjectId

};

const NotificationContractSchema = new Schema({

    metadata: {
        type: Schema.Types.ObjectId,
        ref: 'Contract',
        required: true
    }

});

export const NotificationContract = Notification.discriminator<INotificationContract>('NotificationContract', NotificationContractSchema);
