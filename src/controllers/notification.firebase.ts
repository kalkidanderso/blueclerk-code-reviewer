import { sendNotification } from '../services/firebase';
import { IChat } from '../models/Chat';
import { IJobRequest } from '../models/JobRequest';
import { User } from '../models/User';

/**
 * Send notification through Firebase to the customer contact devices
 */
export const _handleNotification = async ({
    recipientId,
    notificationType,
    messageTitle,
    messageBody,
    chat,
    jobRequest,
    lastReadChatId,
}: {
        recipientId: string,
        notificationType: string,
        messageTitle?: string,
        messageBody?: string,
        chat?: IChat,
        jobRequest?: IJobRequest,
        lastReadChatId?: string,
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

    // Iterate all tokens and send notification
    for (const fbt of firebaseTokens) {
        await sendNotification({
            fbToken: fbt.token,
            notificationType,
            title: messageTitle,
            body: messageBody,
            chatChannel: chat?.chatChannel,
            chatId: chat?._id?.toString(),
            minimizedChat,
            jobRequestId: jobRequest?._id?.toString(),
            lastReadChatId: lastReadChatId?.toString()
        });
    }

    return;

}
