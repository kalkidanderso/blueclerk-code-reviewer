import * as admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { ChatChannels, IChat } from '../models/Chat';
import * as Sentry from '@sentry/node';

/**
 * Initialize Firebase instance and app,
 * called only once on server.ts
 */
export const _initializeFirebase = async () => {

    const { FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID } = process.env;

    const serviceAccount = require(`../../firebase_service_accounts/${FIREBASE_SERVICE_ACCOUNT}`);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
    });

};

/**
 * Send the notification over Firebase to one device,
 * based on the fbToken aka user device registration token
 */
export const sendNotification = async ({
    fbToken,
    notificationId,
    notificationType,
    title,
    body,
    chatChannel,
    chatId,
    minimizedChat,
    jobRequestId,
    jobRequestNumber,
    lastReadChatId,
    readBy
}: {
    fbToken: string,
    notificationId: string,
    notificationType: string,
    title?: string,
    body?: string,
    chatChannel: ChatChannels,
    chatId: string,
    minimizedChat: IChat,
    jobRequestId?: string,
    jobRequestNumber?: string,
    lastReadChatId?: string,
    readBy?: string
}) => {

    // Construct Firebase's message entry
    const message: any = {
        android: {
            priority: 'high',
        },
        notification: {
            title,
            body
        },
        data: {
            appTitle: 'BlueClerk',
            type: notificationType ?? '',
            notificationId: notificationId ?? '',
            chatChannel: chatChannel ?? '',
            messageId: chatId ?? '',
            message: (minimizedChat && JSON.stringify(minimizedChat)) ?? '',
            lastReadMessageId: lastReadChatId ?? '',
            readBy: readBy ?? '',
            color: '#00aaff',
            sound: 'default'
        },
        token: fbToken,
    };

    // Identify the Chat Channel and add the corresponding data
    switch (chatChannel) {
    case ChatChannels.JOB_REQUEST:
        message.data.jobRequestId = jobRequestId;
        message.data.jobRequestNumber = jobRequestNumber;
        break;
    
    default:
        break;
    }

    // Send the message notification
    return getMessaging().send(message)
        .then((response) => {
        // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            Sentry.captureException(error);
            console.log('Error sending message:', error);
        });

};

// TODO: TO BE USED LATER?
export const subscribeToTopic = async (registrationTokens: string[], channelTopic: string) => {

    // await _initializeFirebase();
    
    // Subscribe the devices corresponding to the registration tokens to the topic
    getMessaging().subscribeToTopic(registrationTokens, channelTopic);

    return;

};
