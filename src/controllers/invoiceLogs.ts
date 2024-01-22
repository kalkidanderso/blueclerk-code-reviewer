import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import {
    ContractorPermissions,
    DefaultCommission,
    DefaultPageSize,
    InvoiceStatus,
    Messages,
    Status
} from '../common/constants';
import { IInvoiceLogs } from '../models/invoiceLogs';
import { InvoiceLogs } from '../models/invoiceLogs';
import * as Sentry from '@sentry/node';
import * as helper from '../services/helper';


export const get = async (req: Request, res: Response) => {
    try {
        const params = req.body;
        const { invoice, invoiceId, companyLocation, workType } = req.body;
        const pageSize = req.body?.pageSize ? parseInt(req.body?.pageSize) : null;

        const { query: queryParams = {} } = req;
        const loggedInCompanyId = req.companyId;
        const { customerId, homeOwnerId, companyId, isActive } = queryParams;
        const query: any = {'$and':[]};
        // Return error when all cursors are provided
        if (params.nextCursor && params.previousCursor) {
            return res.json({
                status: Status.Error,
                message: 'Provided cursor could only be one of either nextCursor or previousCursor.'
            });
        }

        if (invoice) {

            query['$and'].push({ invoice: new ObjectId(invoice) });

        } else if (invoiceId) {

            const invoiceIdRegex = helper.getRegex(invoiceId, 'i');
            query['$and'].push({ invoiceId: invoiceIdRegex });
        }
        else if (companyLocation) {

            query['$and'].push({ companyLocation: companyLocation });

        }
        else if (workType) {

            query['$and'].push({ workType: workType });

        }

        console.log('query', query);

        let paginationQuery = {};
        let sortQuery = { createdAt: -1, _id: -1 };

        if (params.nextCursor) {
            // Update pagination query to get the next page
            const cursor = JSON.parse(helper.fromCursorHash(params.nextCursor));
            const cursorId = ObjectId.isValid(cursor._id) ? new ObjectId(cursor._id) : null;
            paginationQuery = {
                $or: [
                    { createdAt: { $lt: new Date(cursor.createdAt) } },
                    { createdAt: new Date(cursor.createdAt), _id: { $lt: cursorId } }
                ]
            };

            

            if (query['$and']) {

                query['$and'].push({ ...paginationQuery });
            }
        }

        if (params.previousCursor) {
            // Update pagination query to get the previous page
            const cursor = JSON.parse(helper.fromCursorHash(params.previousCursor));
            const cursorId = ObjectId.isValid(cursor._id) ? new ObjectId(cursor._id) : null;
            paginationQuery = {
                $or: [
                    { createdAt: { $gt: new Date(cursor.createdAt) } },
                    { createdAt: new Date(cursor.createdAt), _id: { $gt: cursorId } }
                ]
            };

            if (query['$and']) {
                
                query['$and'].push({ ...paginationQuery });
            }
            // Getting previous page is special, we need to reverse the sort
            sortQuery = { createdAt: 1, _id: 1 };
        }

        // Filter jobs using aggregate to be search to another collection
        let invoiceLogs: IInvoiceLogs[] = await InvoiceLogs.aggregate([
            { $match: { ...query } },
            { $sort: sortQuery },
            { $limit: pageSize || DefaultPageSize }
        ]);


        await InvoiceLogs.populate(invoiceLogs,
            [
                {
                    path: 'companyLocation',
                    select: 'name'
                },
                {
                    path: 'createdBy',
                    select: 'profile.displayName'
                },
                {
                    path: 'customer',
                    select: 'contactName'
                },

                {
                    path: 'company',
                    select: 'info.companyName'
                },
                {
                    path: 'workType',
                    select: 'title'
                }]);
        if (params.previousCursor) {
            invoiceLogs = invoiceLogs.reverse();
        }
        const allInvoiceLogs = await InvoiceLogs.aggregate([
            { $match: { ...query } },
            { $count: 'count' }
            // { $sort: sortQuery }
        ]);
        const nextCursor = { createdAt: invoiceLogs[invoiceLogs.length - 1]?.createdAt, _id: invoiceLogs[invoiceLogs.length - 1]?._id };
        const nextPageQuery: any = { $and: [] };
        query['$and']?.map((q: any) => {
            nextPageQuery['$and'].push({ ...q });
        });
        // To be added with the pagination for the previous page
        nextPageQuery['$and'].push({
            $or: [
                { createdAt: { $lt: new Date(nextCursor.createdAt) } },
                { createdAt: new Date(nextCursor.createdAt), _id: { $lt: nextCursor._id } }
            ]
        });
        const isNextPage = await InvoiceLogs.aggregate([
            { $match: { ...nextPageQuery } },
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: 1 }
        ]);

        /**
         * Check if previous page is availabe
         */
        const previousCursor = { createdAt: invoiceLogs[0]?.createdAt, _id: invoiceLogs[0]?._id };
        // Deep clone query
        const previousPageQuery: any = { $and: [] };
        query['$and']?.map((q: any) => {
            previousPageQuery['$and'].push({ ...q });
        });
        // To be added with the pagination for the previous page
        previousPageQuery['$and'].push({
            $or: [
                { createdAt: { $gt: new Date(previousCursor.createdAt) } },
                { createdAt: new Date(previousCursor.createdAt), _id: { $gt: previousCursor._id } }
            ]
        });
        const isPreviousPage = await InvoiceLogs.aggregate([
            { $match: { ...previousPageQuery } },
            { $sort: { createdAt: 1, _id: 1 } },
            { $limit: 1 }
        ]).allowDiskUse(true);


        return res.json({
            status: Status.Success,
            total: allInvoiceLogs[0]?.count,
            invoiceLogs,
            pagination: {
                nextCursor: isNextPage.length ? helper.toCursorHash(JSON.stringify(nextCursor)) : null,
                previousCursor: isPreviousPage.length ? helper.toCursorHash(JSON.stringify(previousCursor)) : null,
                // lastPageCursor: lastPageCursor ? helper.toCursorHash(JSON.stringify(lastPageCursor)) : null,
                pageSize: pageSize || null
            }
        });

    }
    catch (err) {
        console.log('Err', err);
        // Sentry.captureException(err);
        //     return res.json({ 'status': Status.Error, 'message': err.message });
    }
};

export const create = async (data: IInvoiceLogs) => {
    try {

        const logItem = new InvoiceLogs(data);

        await logItem.save();

    }
    catch (err) {
        console.log(err);
        Sentry.captureException('error logging invoice', err);
    }
};
