import { Request, Response } from 'express';

import { NotificationTypes, Status } from '../common/constants';
import { ICustomer } from '../models/Customer';
import { IServiceTicket } from '../models/ServiceTicket';

import { _createCustomer } from './customer';
import { _createServiceTicket } from './serviceTicket';
import { _handleNotification } from './notification';

/**
 * Create service ticket for web integration
 */
export const createServiceTicket = (req: Request, res: Response, sio: any) => {

    const companyId = req.otherCompanyId || req.companyId;

    /**
     * Call customer controller's _createCustomer to create customer,
     * if the customer is existed, return the existing one
     */
    _createCustomer(req, res, (err: any, customer: ICustomer) => {
        if (err) {
            return res.json({ status: Status.Error, message: err });
        }

        // Assign the created / found customer to be used in _createServiceTicket
        req.body.customerId = customer._id;

        /**
         * Call service ticket controller's _createServiceTicket
         */
        _createServiceTicket(req, res, async (err: any, serviceTicket: IServiceTicket) => {
            if (err) {
                return res.json({ status: Status.Error, message: err });
            }

            await serviceTicket
                .populate({
                    path: 'company',
                    select: 'info.companyName address'
                })
                .populate({
                    path: 'customer',
                    select: 'info.email profile.displayName contactName'
                })
                .populate({
                    path: 'jobType',
                    select: 'name'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName'
                })
                .execPopulate();

            // Save notification to DB and send through SocketIO
            await _handleNotification({
                sio, companyId,
                notificationType: NotificationTypes.SERVICE_TICKET_CREATED,
                messageTitle: 'Service Ticket created',
                messageBody: `${serviceTicket.ticketId} created via web`,
                metadataId: serviceTicket._id
            });

            return res.json({ status: Status.Success, message: 'Service ticket created successfully.', customer, serviceTicket });
        });
    })

}