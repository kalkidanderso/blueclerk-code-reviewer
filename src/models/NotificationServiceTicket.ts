import mongoose, { Schema } from 'mongoose';
import { Notification, INotification } from './Notification';

export interface INotificationServiceTicket extends INotification {

    metadata: Schema.Types.ObjectId

};

const NotificationServiceTicketSchema = new Schema({

    metadata: {
        type: Schema.Types.ObjectId,
        ref: 'ServiceTicket',
        required: true
    }

});

export const NotificationServiceTicket = Notification.discriminator<INotificationServiceTicket>('NotificationServiceTicket', NotificationServiceTicketSchema);
