import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { ICustomer } from '../models/Customer';
import { IJobRequest } from '../models/JobRequest';

export enum ChatChannels{
    SERVICE_TICKET = 'serviceTicket',
    JOB_REQUEST = 'jobRequest',
    JOB = 'job'
}

export interface IChat extends Document {

    chatChannel: ChatChannels
    user: Schema.Types.ObjectId | IUser
    company?: Schema.Types.ObjectId | ICompany
    customer?: Schema.Types.ObjectId | ICustomer
    replyTo?: Schema.Types.ObjectId | IChat
    message: string
    images?: {
        imageUrl?: string
        uploadedBy?: Schema.Types.ObjectId | IUser
        createdAt?: Date
        updatedAt?: Date
    }[]
    readStatus: {
        isRead: boolean
        readBy: Schema.Types.ObjectId | IUser
        readAt: Date
    }
    createdAt: Date
    updatedAt: Date

}

const ChatSchema = new Schema(
    {
        chatChannel: {
            type: String,
            enum: Object.values(ChatChannels),
            required: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company'
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: 'Customer'
        },
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: 'Chat'
        },
        message: String,
        images: [{
            imageUrl: String,
            uploadedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            createdAt: Date,
            updatedAt: Date
        }],
        readStatus: {
            isRead: { type: Boolean, default: false },
            readBy: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            readAt: Date
        }
    },
    { timestamps: true }
);


//Indexes
ChatSchema.index({ user: 1 });
ChatSchema.index({ company: 1 });
ChatSchema.index({ customer: 1 });
ChatSchema.index({ replyTo: 1 });
ChatSchema.index({ chatChannel: 1, jobRequest: 1 });

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);

// SERVICE TICKET DISCRIMINATOR

// TODO: to be added in the future


// JOB REQUEST DISCRIMINATOR

export interface IJobRequestChat extends IChat {

    jobRequest: Schema.Types.ObjectId | IJobRequest

}

const JobRequestChatSchema = new Schema({

    jobRequest: {
        type: Schema.Types.ObjectId,
        ref: 'JobRequest',
        required: true
    }

});


export const JobRequestChat = Chat.discriminator<IJobRequestChat>('JobRequestChat', JobRequestChatSchema);


// JOB DISCRIMINATOR

// TODO: to be added in the future
