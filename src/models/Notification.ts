import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationTypes {
    SERVICE_TICKET_CREATED = 'ServiceTicketCreated',
    CONTRACT_INVITATION = 'ContractInvitation',
    CONTRACT_ACCEPTED = 'ContractAccepted',
    CONTRACT_CANCELED = 'ContractCanceled',
    CONTRACT_REJECTED = 'ContractRejected',
    CONTRACT_FINISHED = 'ContractFinished',
    JOB_RESCHEDULED = 'JobRescheduled',
    COMPANY_INVOICE_FAILED = 'CompanyInvoiceFailed',
    JOB_REQUEST_CREATED = 'JobRequestCreated',
    JOB_REQUEST_STATUS_UPDATED = 'JobRequestStatusUpdated',
    NEW_CHAT = 'NewChat',
    CHAT_READ = 'ChatRead'
}

export enum FbNotificationType {
    NEW_CHAT = 'chat',
    CHAT_READ = 'chatRead'
}

export interface INotificationQuery {

    company: string
    'dismissedStatus.isDismissed'?: string | boolean
    'readStatus.isRead'?: string | boolean

}

export interface INotification extends Document {

    company: Schema.Types.ObjectId
    customer: Schema.Types.ObjectId
    customerContact: Schema.Types.ObjectId
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
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: 'Customer'
        },
        customerContact: {
            type: Schema.Types.ObjectId,
            ref: 'User'
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
