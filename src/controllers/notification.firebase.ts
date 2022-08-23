import { sendNotification } from '../services/firebase';
import { CustomerContact } from '../models/CustomerContact';
import { IChat } from '../models/Chat';

/**
 * Send notification through Firebase to the customer contact devices
 */
export const _handleNotification = async ({ recipientId, messageTitle, messageBody, dataObj, chat }: { recipientId: string, messageTitle: string, messageBody: string, dataObj: any, chat: IChat }) => {

    // Find the user object of the customer contact
    const user = await CustomerContact.findById(dataObj.customerContact);
    // Retrieve all his devices' token
    const firebaseTokens = user.firebaseTokens;

    // Iterate all tokens and send notification
    for (const fbt of firebaseTokens) {
        await sendNotification({
            fbToken: fbt.token,
            title: messageTitle,
            body: messageBody,
            chatChannel: chat.chatChannel,
            dataObj,
            chat
        });
    }

    return;

}
