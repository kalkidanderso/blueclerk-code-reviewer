import { Request, Response } from 'express';
import { Messages, SocketEvents, Status, DefaultPageSize } from '../common/constants';

import { IUser } from '../models/User';
import { Notification, INotification, NotificationTypes } from '../models/Notification';
import { NotificationContract, NotificationServiceTicket, NotificationJob, NotificationJobRequest, NotificationChat } from '../models/NotificationDiscriminator';
import * as helper from '../services/helper';

/**
 * Construct and get query for notification,
 * by default will retrieve non-dismissed notifications
 */
const _getNotificationQuery = (
    companyId: string,
    isDismissed: 'ALL' | boolean,
    isRead: 'ALL' | boolean,
    search?: string
): any => {

    const query: any = {
        $and: [
            { company: companyId },

        ]
    };
    const queryAnd: any[] = [];
    if (isDismissed != null && isDismissed !== 'ALL') {
        queryAnd.push({ 'dismissedStatus.isDismissed': isDismissed });
    }

    if (isRead != null && isRead !== 'ALL') {
        queryAnd.push({ 'readStatus.isRead': isRead });
    }
    if (search && search != '') {
        const searchRegex = helper.getRegex(search, 'i');
        queryAnd.push({
            $or: [
                {
                    'message.title': searchRegex
                },
                {
                    'message.body': searchRegex
                }
            ]
        });
    }
    query['$and'].push(...queryAnd);
    return query;

};

/**
 * Save notification to database,
 * and send through SocketIO to the company
 */
export const _handleNotification = async ({ sio, companyId, notificationType, messageTitle, messageBody, metadataId }: { sio: any, companyId: string, notificationType: NotificationTypes, messageTitle: string, messageBody: string, metadataId: string }) => {

    let notification: INotification;
    const notificationEntry = {
        company: companyId,
        notificationType,
        message: {
            title: messageTitle,
            body: messageBody
        },
        metadata: metadataId
    };

    /**
     * Create the notification discriminator based on the notification type,
     * this is important for the metadata to be populated properly
     */
    switch (notificationType) {
    case NotificationTypes.SERVICE_TICKET_CREATED:
        notification = new NotificationServiceTicket(notificationEntry);
        break;

    case NotificationTypes.CONTRACT_INVITATION:
    case NotificationTypes.CONTRACT_ACCEPTED:
    case NotificationTypes.CONTRACT_CANCELED:
    case NotificationTypes.CONTRACT_REJECTED:
    case NotificationTypes.CONTRACT_FINISHED:
        notification = new NotificationContract(notificationEntry);
        break;

    case NotificationTypes.JOB_RESCHEDULED:
        notification = new NotificationJob(notificationEntry);
        break;

    case NotificationTypes.JOB_REQUEST_CREATED:
    case NotificationTypes.JOB_REQUEST_STATUS_UPDATED:
        notification = new NotificationJobRequest(notificationEntry);
        break;

    case NotificationTypes.NEW_CHAT:
        notification = new NotificationChat(notificationEntry);
        break;

    default:
        notification = new Notification(notificationEntry);
        break;
    }

    // Save the notification with Service Ticket as the metadata
    await notification.save();
    await notification.populate('metadata').execPopulate();
    await sio.to(companyId && companyId.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);

};

/**
 * Retrieve multiple notifications based on company
 */
export const getNotifications = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    const { isDismissed, isRead, search } = params;
    const _query: any = _getNotificationQuery(companyId, isDismissed, isRead, search);
    const currentPage = parseInt(params.currentPage || 0);
    const pageSize = parseInt(params.pageSize || DefaultPageSize);

    const total = await Notification.count(_query);
    const totalUnread = await Notification.count(_getNotificationQuery(companyId, false, false));
    Notification.find(_query).sort({ createdAt: 'desc' })
        .skip(currentPage * pageSize)
        .limit(pageSize)
        .populate({
            path: 'readStatus.readBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'dismissedStatus.dismissedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'metadata',
            populate: [{ path: 'jobRequest' }]
        })
        .exec((err: any, notifications: INotification[]) => {
            if (err) {
                return res.json({ status: Status.Error, message: Messages.GenericError });
            }

            return res.json({
                status: Status.Success,
                notifications,
                total,
                totalUnread
            });
        }
        );
};

/**
 * Update the status of notificatoin, read and dismiss status
 */
export const updateNotification = (req: Request, res: Response) => {

    const companyId = req.companyId;
    const user = <IUser>req.user;
    const { notificationId } = req.params;
    const params = req.body;

    Notification.findOne({
        _id: notificationId,
        company: companyId
    })
        .exec((err: any, notification: INotification) => {
            if (err) {
                return res.json({ status: Status.Error, message: Messages.GenericError });
            }

            if (!notification) {
                return res.json({ status: Status.NotFound, message: Messages.NotificationNotFound });
            }

            // TODO: Update to use ?? operator when using ES2020
            if (params.isRead != null) {
                const readStatus = notification.readStatus;
                readStatus.isRead = params.isRead;
                readStatus.readBy = params.isRead ? user._id : null;
                readStatus.readAt = params.isRead ? new Date() : null;
            }
            if (params.isDismissed != null) {
                const dismissedStatus = notification.dismissedStatus;
                dismissedStatus.isDismissed = params.isDismissed;
                dismissedStatus.dismissedBy = params.isDismissed ? user._id : null;
                dismissedStatus.dismissedAt = params.isDismissed ? new Date() : null;
            }

            notification.save(async (err: any, updatedNotification: INotification) => {
                if (err) {
                    return res.json({ status: Status.Error, message: Messages.GenericError });
                }

                await updatedNotification
                    .populate({
                        path: 'readStatus.readBy',
                        select: 'profile.displayName'
                    })
                    .populate({
                        path: 'dismissedStatus.dismissedBy',
                        select: 'profile.displayName'
                    })
                    .populate({
                        path: 'metadata'
                    })
                    .execPopulate();
                return res.json({
                    status: Status.Success,
                    message: 'Notification updated successfully.',
                    notification: updatedNotification
                });

            });
        }
        );

};
