import { Request, Response } from 'express';
import { Status } from '../common/constants';

import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { JobRequest } from '../models/JobRequest';
import { Chat, ChatChannels, IJobRequestChat, JobRequestChat } from '../models/Chat';

/**
 * To create new chat
 */
export const createChat = async (req: Request, res: Response) => {

    const { chatChannel, id } = req.params;
    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    let chat;

    // Handle images if exist
    if (req.files) {
        params.imagesFile = JSON.parse(JSON.stringify(req.files));
    }

    try {
        switch (chatChannel) {
            case ChatChannels.JOB_REQUEST:
                chat = await _createJobRequestChat(params, id, user, company);
                break;

            default:
                break;
        }
    } catch (error) {
        return res.json({ status: Status.Error, message: error });
    }

    return res.json({ status: Status.Success, message: 'Message sent successfully', chat });

}

/**
 * To retrieve chats based on chat channel and the given ID
 */
export const getChats = async (req: Request, res: Response) => {

    const { chatChannel, id } = req.params;
    const company = <ICompany>req.company;
    let chats;

    switch (chatChannel) {
        case ChatChannels.JOB_REQUEST:
            const jobRequest = await JobRequest.findOne({ _id: id, company: company._id })

            if (!jobRequest) {
                return res.json({ status: Status.Error, message: 'Job Request not found' });
            }

            chats = await Chat.find({ chatChannel: ChatChannels.JOB_REQUEST, jobRequest: jobRequest._id })
                .populate({ path: 'jobRequest', select: '-__v -track' })
                .populate({ path: 'user', select: 'profile info contact location' })
                .populate({ path: 'company', select: 'info address contact' })
                .populate({ path: 'customer', select: 'profile info address contact' });

            break;
    
        default:
            break;
    }

    return res.json({ status: Status.Success, chats });

}

// =======================================
// ===== [ PARTIAL METHODS BELOW] ========
// =======================================

/**
 * Partial method to create Job Request Chat
 */
const _createJobRequestChat = async (params: any, id: string, user: IUser, company: ICompany): Promise<IJobRequestChat> => {

    // Check if Job Request exist
    const jobRequest = await JobRequest.findOne({ _id: id, company: company._id });
    if (!jobRequest) {
        throw new Error('Job Request not found');
    }

    // Construct the Job Request Chat
    const jobRequestChat = new JobRequestChat({
        jobRequest,
        chatChannel: ChatChannels.JOB_REQUEST,
        user, company,
        message: params.message
    });

    // Push images data to chat's images
    if (params.imagesFile?.images?.length) {
        const images = params.imagesFile?.images.map((image: any) => {
            return { imageUrl: image.location, uploadedBy: user.id, createdAt: new Date(), updatedAt: new Date() };
        });
    
        jobRequestChat.images.push(...images);
    }

    return await jobRequestChat.save();

}
