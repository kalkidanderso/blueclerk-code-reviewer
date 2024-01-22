import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Status } from '../common/constants';
import { ICustomer } from '../models/Customer';
import { IServiceTicket } from '../models/ServiceTicket';
import { NotificationTypes } from '../models/Notification';

import { _createCustomer } from './customer';
import { _createServiceTicket } from './serviceTicket';
import { _handleNotification } from './notification';

/**
 * Create service ticket for web integration
 */
export const createServiceTicket = (req: Request, res: Response, sio: any) => {

    // Validate required params
    const params = req.body;
    if (params.itemId && !ObjectId.isValid(params.itemId)) {
        return res.json({ status: Status.Error, message: ['parameter itemId: must be an ObjectId'] });
    }

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
                .populate({ path: 'company', select: 'info.companyName address contact' })
                .populate({ path: 'jobType', select: 'title description sku' })
                .populate({ path: 'item', select: 'name description sku isFixed charges tax' })
                .populate({ path: 'createdBy', select: 'profile.displayName auth.email' })
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
    });

};