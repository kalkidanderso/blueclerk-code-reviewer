import { Request, Response } from 'express';
import { Messages, Status } from '../common/constants';

import { IUser } from '../models/User';
import { Notification, INotification, INotificationQuery } from '../models/Notification';
import { NotificationServiceTicket, INotificationServiceTicket } from '../models/NotificationServiceTicket';

/**
 * Construct and get query for notification,
 * by default will retrieve non-dismissed notifications
 */
const _getNotificationQuery = (
    companyId: string,
    isDismissed: 'ALL' | boolean,
    isRead: 'ALL' | boolean
): INotificationQuery => {

    const query: INotificationQuery = {
        company: companyId,
        'dismissedStatus.isDismissed': false
    }

    if (isDismissed === 'ALL') {
        delete query['dismissedStatus.isDismissed'];
    } else if (isDismissed != null) {
        query['dismissedStatus.isDismissed'] = isDismissed
    }

    if (isRead != null && isRead !== 'ALL') {
        query['readStatus.isRead'] = isRead
    }

    return query;

}

/**
 * Retrieve multiple notifications based on company
 */
export const getNotifications = (req: Request, res: Response) => {

    const companyId = req.companyId;
    const { isDismissed, isRead } = req.query;
    const _query: INotificationQuery = _getNotificationQuery(companyId, isDismissed, isRead);

    Notification.find(_query).sort({ createdAt: 'desc' })
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
        .exec((err: any, notifications: INotification[]) => {
            if (err) {
                return res.json({ status: Status.Error, message: Messages.GenericError })
            }

            return res.json({
                status: Status.Success,
                notifications
            })
        }
    );

}

/**
 * Update the status of notificatoin, read and dismiss status
 */
export const updateNotification = (req: Request, res: Response) => {

    const companyId = req.companyId;
    const user = <IUser>req.user;
    const { notificationId } = req.params;
    const params = req.body;

    NotificationServiceTicket.findOne({
        _id: notificationId,
        company: companyId
    })
        .exec((err: any, notification: INotificationServiceTicket) => {
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

            notification.save((err: any, updatedNotification: INotificationServiceTicket) => {
                if (err) {
                    return res.json({ status: Status.Error, message: Messages.GenericError });
                }

                updatedNotification
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
                    .execPopulate()
                    .then((notification) => {
                        return res.json({
                            status: Status.Success,
                            message: 'Notification updated successfully.',
                            notification: notification
                        })
                    });

            })
        }
    );

}