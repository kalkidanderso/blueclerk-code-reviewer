import { sendNotification } from '../services/firebase';
import { IChat } from '../models/Chat';
import { IJobRequest } from '../models/JobRequest';
import { User } from '../models/User';
import { NotificationChat } from '../models/NotificationDiscriminator';

/**
 * Send notification through Firebase to the customer contact devices
 */
export const _handleNotification = async ({
    recipientId,
    notificationType,
    fbNotificationType,
    messageTitle,
    messageBody,
    metadataId,
    chat,
    jobRequest,
    lastReadChatId,
    readBy,
    saveToDb = true,
}: {
    recipientId: string,
    notificationType: string,
    fbNotificationType: string,
    messageTitle?: string,
    messageBody?: string,
    metadataId?: string,
    chat?: IChat,
    jobRequest?: IJobRequest,
    lastReadChatId?: string,
    readBy?: string
    saveToDb?: boolean
}) => {

    // Find the user object of the customer contact
    const user = await User.findById(recipientId);
    // Retrieve all his devices' token
    const firebaseTokens = user.firebaseTokens;

    // Deep clone of chat/message object and remove unused data
    let minimizedChat;
    if (chat) {
        minimizedChat = JSON.parse(JSON.stringify(chat));
        delete minimizedChat.jobRequest;
        delete minimizedChat.company;
        delete minimizedChat.customer;
    }

    const notification = new NotificationChat({
        customer: jobRequest?.customer,
        customerContact: recipientId,
        notificationType,
        message: {
            title: messageTitle,
            body: messageBody
        },
        metadata: metadataId
    });

    // Save customer notification to DB
    if (saveToDb) {
        await notification.save();
    }

    // Iterate all tokens and send notification
    for (const fbt of firebaseTokens) {
        await sendNotification({
            fbToken: fbt.token,
            notificationId: notification?._id?.toString(),
            notificationType: fbNotificationType,
            title: messageTitle,
            body: messageBody,
            chatChannel: chat?.chatChannel,
            chatId: chat?._id?.toString(),
            minimizedChat,
            jobRequestId: jobRequest?._id?.toString(),
            jobRequestNumber: jobRequest?.requestId?.toString(),
            lastReadChatId: lastReadChatId?.toString(),
            readBy
        });
    }

    return;

};
