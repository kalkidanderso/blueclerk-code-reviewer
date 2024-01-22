import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Messages, Status } from '../common/constants';

import { IUser } from '../models/User';
import { CompanyTypes, ICompany } from '../models/Company';
import { IJobRequest, JobRequest } from '../models/JobRequest';
import { IChat, Chat, ChatChannels, IJobRequestChat, JobRequestChat } from '../models/Chat';
import { _handleNotification } from '../controllers/notification.firebase';
import { NotificationTypes, FbNotificationType } from '../models/Notification';
import * as Sentry from '@sentry/node';

/**
 * To create new chat
 */
export const createChat = async (req: Request, res: Response) => {

    const { chatChannel, id } = req.params;
    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    let repliedChat: IChat;
    let chat;

    // Handle images if exist
    if (req.files) {
        params.imagesFile = JSON.parse(JSON.stringify(req.files));
    }

    // Check if replyTo provided and exist or not
    if (params.replyToId) {
        repliedChat = await Chat.findById(params.replyToId);
        if (!repliedChat) {
            return res.json({ status: Status.Error, message: 'Message to reply not found' });
        }
    }

    // Check if there nothing to send
    if (!params.message && !params.imagesFile?.images?.length) {
        return res.json({ status: Status.Error, message: 'No message, no image, nothing to send' });
    }

    try {
        switch (chatChannel) {
        case ChatChannels.JOB_REQUEST:
            chat = await _createJobRequestChat(params, id, user, company, repliedChat);
            break;

        default:
            break;
        }
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: err?.message ?? Messages.GenericError });
    }

    return res.json({ status: Status.Success, message: 'Message sent successfully', chat });

};

/**
 * To retrieve chats based on chat channel and the given ID
 */
export const getChats = async (req: Request, res: Response) => {

    const { chatChannel, id } = req.params;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    let chats;
    let unreadChat = 0;

    switch (chatChannel) {
    case ChatChannels.JOB_REQUEST:
        const jobRequest = await _findJobRequest(req.params, id, user, company);

        chats = await Chat.find({ chatChannel: ChatChannels.JOB_REQUEST, jobRequest: jobRequest._id })
            .populate({ path: 'jobRequest', select: '-__v -track' })
            .populate({ path: 'replyTo', select: '-__v', populate: [{ path: 'user', select: 'profile info contact' }] })
            .populate({ path: 'readStatus.readBy', select: 'profile info contact location' })
            .populate({ path: 'user', select: 'profile info contact location' })
            .populate({ path: 'company', select: 'info address contact' })
            .populate({ path: 'customer', select: 'profile info address contact' });

        // Retrieve unread chat count
        unreadChat = await _getUnreadChatCount(company._id, jobRequest._id);

        break;
    
    default:
        break;
    }

    return res.json({ status: Status.Success, unreadChat, chats });

};

/**
 * To mark chats as read based on last given chat ID
 */
export const markRead = async (req: Request, res: Response) => {

    const { chatChannel, id } = req.params;
    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    const jobRequest = await _findJobRequest(params, id, user, company);

    // Retrieve and check if last message 
    const lastChat = await Chat.findById(params.lastReadChatId);
    if (!lastChat) {
        return res.json({ status: Status.Error, message: 'Last message not found' });
    }

    // Retrieve all chats to be read
    const chatsToRead = await JobRequestChat.find({
        jobRequest: jobRequest._id,
        _id: { $lte: lastChat._id },
        customer: { $exists: true },
        'readStatus.isRead': false,
    });

    // Iterate all chats to be read and update the read status
    for (const chat of chatsToRead) {
        chat.readStatus.isRead = true;
        chat.readStatus.readBy = user._id;
        chat.readStatus.readAt = new Date;
        await chat.save();
    }

    // Send simple notification to mobile through Firebase,
    // for mobile internal usage, not saving to DB
    await _handleNotification({
        recipientId: jobRequest.customerContact,
        notificationType: NotificationTypes.CHAT_READ,
        fbNotificationType: FbNotificationType.CHAT_READ,
        metadataId: lastChat._id,
        chat: lastChat,
        jobRequest,
        lastReadChatId: lastChat._id,
        readBy: user?.profile?.displayName,
        saveToDb: false
    });

    // Retrieve unread chat count
    const unreadChat = await _getUnreadChatCount(company._id, jobRequest._id);

    return res.json({
        status: Status.Success,
        message: 'Chats marked as read successfully.',
        unreadChat
    });

};

// =======================================
// ===== [ PARTIAL METHODS BELOW] ========
// =======================================

/**
 * Partial method to create Job Request Chat
 */
const _createJobRequestChat = async (params: any, id: string, user: IUser, company: ICompany, repliedChat: IChat): Promise<IJobRequestChat> => {

    const jobRequest = await _findJobRequest(params, id, user, company);

    // Construct the Job Request Chat
    const jobRequestChat = new JobRequestChat({
        jobRequest,
        chatChannel: ChatChannels.JOB_REQUEST,
        user, company,
        replyTo: repliedChat,
        message: params.message
    });

    // Push images data to chat's images
    if (params.imagesFile?.images?.length) {
        const images = params.imagesFile?.images.map((image: any) => {
            return { imageUrl: image.location, uploadedBy: user.id, createdAt: new Date(), updatedAt: new Date() };
        });

        jobRequestChat.images.push(...images);
    }

    await jobRequestChat.save();
    await jobRequestChat
        .populate({ path: 'jobRequest', select: '-__v -track' })
        .populate({ path: 'replyTo', select: '-__v', populate: [{ path: 'user', select: 'profile info contact' }] })
        .populate({ path: 'readStatus.readBy', select: 'profile info contact location' })
        .populate({ path: 'user', select: 'profile info contact location' })
        .populate({ path: 'company', select: 'info address contact' })
        .populate({ path: 'customer', select: 'profile info address contact' })
        .execPopulate();

    // Send notification over Firebase to Customer Contact
    await _handleNotification({
        recipientId: jobRequest.customerContact,
        notificationType: NotificationTypes.NEW_CHAT,
        fbNotificationType: FbNotificationType.NEW_CHAT,
        messageTitle: `You have new message for Job Request #${jobRequest.requestId}`,
        messageBody: jobRequestChat.message,
        metadataId: jobRequestChat._id,
        chat: jobRequestChat,
        jobRequest
    });

    return jobRequestChat;

};

// Retrieve unread chat count
const _getUnreadChatCount = async (companyId: string, jobRequestId: string) => {
    const unreadChat = await Chat.find({
        chatChannel: ChatChannels.JOB_REQUEST,
        jobRequest: jobRequestId,
        company: { $ne: companyId },
        'readStatus.isRead': false
    })?.countDocuments();

    return unreadChat;
};

const _findJobRequest =  async (params: any, id: string, user: IUser, company: ICompany): Promise<IJobRequest> => {

    // Check if Job Request exist
    let jobRequest = await JobRequest.findOne({ _id: id, company: company._id });

    // if it is a supplier, searching by the manufacturer
    if(company.type == CompanyTypes.SUPPLIER) {
        jobRequest = await JobRequest.findOne({ _id: id, manufacturer: company._id });
    }
    if (!jobRequest) {
        throw new Error('Job Request not found');
    }

    return jobRequest;
};
