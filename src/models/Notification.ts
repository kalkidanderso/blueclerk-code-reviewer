import mongoose, { Document, Schema } from 'mongoose';
import { NotificationTypes } from '../common/constants';

export interface INotificationQuery {

    company: string
    'dismissedStatus.isDismissed'?: string | boolean
    'readStatus.isRead'?: string | boolean

}

export interface INotification extends Document {

    company: Schema.Types.ObjectId
    notificationType: string
    message: {
        title: String
        body: String
    }
    readStatus: {
        isRead: boolean
        readBy: Schema.Types.ObjectId
        readAt: Date
    }
    dismissedStatus: {
        isDismissed: boolean
        dismissedBy: Schema.Types.ObjectId
        dismissedAt: Date
    }
    createdAt: Date

};

const NotificationSchema = new Schema(

    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        notificationType: {
            type: String,
            enum: Object.values(NotificationTypes),
            required: true
        },
        message: {
            title: String,
            body: String,
        },
        readStatus: {
            isRead: { type: Boolean, default: false },
            readBy: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            readAt: Date
        },
        dismissedStatus: {
            isDismissed: { type: Boolean, default: false },
            dismissedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            dismissedAt: Date
        }
    },
    { timestamps: { createdAt: true, updatedAt: false } }

);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
