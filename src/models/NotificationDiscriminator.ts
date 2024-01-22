import { Schema } from 'mongoose';
import { Notification, INotification } from './Notification';

// CONTRACT DISCRIMINATOR
export interface INotificationContract extends INotification {

    metadata: Schema.Types.ObjectId

}

const NotificationContractSchema = new Schema({

    metadata: {
        type: Schema.Types.ObjectId,
        ref: 'Contract',
        required: true
    }

});

// SERVICE TICKET DISCRIMINATOR
export interface INotificationServiceTicket extends INotification {

    metadata: Schema.Types.ObjectId

}

const NotificationServiceTicketSchema = new Schema({

    metadata: {
        type: Schema.Types.ObjectId,
        ref: 'ServiceTicket',
        required: true
    }

});

// JOB DISCRIMINATOR
export interface INotificationJob extends INotification {

    metadata: Schema.Types.ObjectId

}

const NotificationJobSchema = new Schema({

    metadata: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    }

});

// JOB REQUEST DISCRIMINATOR
export interface INotificationJobRequest extends INotification {

    metadata: Schema.Types.ObjectId

}

const NotificationJobRequestSchema = new Schema({

    metadata: {
        type: Schema.Types.ObjectId,
        ref: 'JobRequest',
        required: true
    }

});

// CHAT DISCRIMINATOR
export interface INotificationChat extends INotification {

    metatadata: Schema.Types.ObjectId

}

const NotificationChatSchema = new Schema({

    metadata: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    }

});

export const NotificationContract = Notification.discriminator<INotificationContract>('NotificationContract', NotificationContractSchema);

export const NotificationServiceTicket = Notification.discriminator<INotificationServiceTicket>('NotificationServiceTicket', NotificationServiceTicketSchema);

export const NotificationJob = Notification.discriminator<INotificationJob>('NotificationJob', NotificationJobSchema);

export const NotificationJobRequest = Notification.discriminator<INotificationJobRequest>('NotificationJobRequest', NotificationJobRequestSchema);

export const NotificationChat = Notification.discriminator<INotificationChat>('NotificationChat', NotificationChatSchema);
