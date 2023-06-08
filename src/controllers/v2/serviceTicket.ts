import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import { DefaultPageSize, Status } from '../../common/constants';
import {
    splitArray, fillQueryCommon, getFilteredCustomerIds,
    getFilteredJobLocationsIds, getFilteredJobSitesIds, getFilteredTechniciansIds
} from './common';
import { Contact } from '../../models/Contact';
import { HomeOwner } from '../../models/HomeOwner';
import * as helper from '../../services/helper';
import { IServiceTicket, ServiceTicket } from '../../models/ServiceTicket';

export const getServiceTickets = async (req: Request, res: Response) => {
    const bodyParams = req.body;
    // Return error when all cursors are provided
    if (bodyParams.nextCursor && bodyParams.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }
    const queryParams = req.query;
    const companyId = req.otherCompanyId || req.companyId;
    const currentPage = bodyParams.currentPage || 0;
    const pageSize = bodyParams.pageSize || DefaultPageSize;

    // Data query that used to search Tickets
    const initialQuery: any = {
        $and: [
            { company: companyId }
        ]
    };
    _fillInitialQueryTickets(bodyParams, queryParams, initialQuery);

    const filteredInitialJobs = await ServiceTicket.aggregate([
        { $match: initialQuery },
        {
            $project:
            {
                customer: 1,
                customerContactId: 1,
                jobLocation: 1,
                jobSite: 1,
                "tasks.technician": 1,
                HomeOwner: 1,
            },
        },
    ]);

    // Split the initial tickets into subarrays with 30,000 length, to do parallel processing
    const filteredInitialTicketsSplited = splitArray(filteredInitialJobs, 30000);
    const parallelFilter = filteredInitialTicketsSplited.map((value: any[]) => _getFilteredTicketsIds(value, bodyParams));
    const finalTicketsIds = (await Promise.all(parallelFilter)).flat()
    const finalQuery: any = {
        $and: [{ _id: { $in: finalTicketsIds } }]
    }

    const finalParallelProcess = [
        ServiceTicket.aggregate([
            { $match: finalQuery },
            {
                $count: "count"
            }
        ]),
        ServiceTicket.aggregate([
            { $match: finalQuery },
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: (currentPage * pageSize) },
            { $limit: pageSize },
        ])
    ];

    const [total, tickets]: (any[] | IServiceTicket[]) = await Promise.all(finalParallelProcess);

    await ServiceTicket.populate(tickets, [
        {
            path: 'customer',
            select: 'info.email profile.displayName contactName',
        },
        {
            path: 'homeOwner',
            select: 'info profile address location contact'
        },
        {
            path: 'createdBy',
            select: 'profile.displayName'
        },
        {
            path: 'technician',
            select: 'profile.displayName'
        },
        {
            path: 'editedBy',
            select: 'profile.displayName'
        }
    ]);
    
    return res.json({
        status: Status.Success,
        serviceTickets: tickets,
        total: total[0]?.count,
    });
}

/**
 * ===================================
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */

/**
 * Check and add if params filter provided to initial jobs query
 * @param bodyParams params provided on the request body
 * @param queryParams param provided on the request query
 * @param query query to be filled
 */
const _fillInitialQueryTickets = (bodyParams: any, queryParams: any, query: any) => {
    const { workType, companyLocation } = queryParams;
    const { technicianIds, status, startDate, endDate, customerId } = bodyParams;
    let technicianIdsArr: any[];
    if (technicianIds) {
        // Validate is technician ids is already array or object
        technicianIdsArr = Array.isArray(technicianIds)
            ? technicianIds
            : technicianIds.split(',').filter((element: any) => element)
    }
    if (technicianIdsArr?.length > 0) {
        // convert technician Id from string to objectId and remove falsy value 
        const technicians = technicianIdsArr.map(technicianId => {
            if (ObjectId.isValid(technicianId)) return new ObjectId(technicianId);
        }).filter(tech => tech);
        query['$and'].push({
            $or: [
                { 'tasks.technician': { $in: technicians } },
                { 'tasks.contractor': { $in: technicians } }
            ]
        });
    }
    if (status == 0) {
        query['$and'].push({ status: { $ne: 1 } });
        query['$and'].push({ jobCreated: false });
    }
    if (status == 1) {
        query['$and'].push(
            {
                $or: [
                    {
                        $and: [
                            { status: { $ne: 1 } }
                        ]
                    },
                    {
                        $and: [
                            { status: 1 },
                            { jobCreated: true }
                        ]
                    },
                ]
            });
    }
    if (startDate && endDate) {
        const startDateMoment = moment(startDate).format('YYYY-MM-DD');
        const endDateMoment = moment(endDate).format('YYYY-MM-DD');
        query['$and'].push({ dueDate: { $gte: new Date(startDateMoment), $lte: new Date(endDateMoment) } });
    }
    if (customerId) {
        query['$and'].push({ customer: new ObjectId(customerId) });
    }
    fillQueryCommon({ workType, companyLocation }, query['$and']);
}

const _getFilteredContactsIds = async (contactsIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    //early return
    if (!keywordRegex) {
        return contactsIds;
    }
    const query: any = {
        $and: [{
            _id: {
                $in: contactsIds,
            },
        },]
    };
    query['$and'].push({ "name": keywordRegex });

    const filteredContactsIds = (await Contact.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredContactsIds;
}


const _getFilteredHomeOwnersIds = async (homeOwnersIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    //early return
    if (!keywordRegex) {
        return homeOwnersIds;
    }
    const query: any = {
        $and: [{
            _id: {
                $in: homeOwnersIds,
            },
        },]
    };
    query['$and'].push({ "profile.displayName": keywordRegex });

    const filteredHomeOwnersIds = (await HomeOwner.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredHomeOwnersIds;
}

/**
 * Get the ids of filtered jobs
 * @param filteredInitialJobs the initial filtered jobs
 * @param params params received on the request to filter
 * @param jobSitesFieldsToFilter fields name used to filter on job sites by keyword
 * @param jobLocationsFieldsToFilter fields name used to filter on job locations by keyword
 * @returns Promise<ObjectId[]>
 */
const _getFilteredTicketsIds = async (filteredInitialTickets: any[], params: any): Promise<ObjectId[]> => {
    // Get the ids linked to the jobs and that they are on other collections
    const ticketsIds = filteredInitialTickets.map((value) => value._id);

    // Get fields 
    const { keyword } = params;
    //early return
    if (!keyword) {
        return ticketsIds;
    }
    const query: any = {
        $and: [
            { _id: { $in: ticketsIds } }
        ]
    };

    const jobSitesFieldsToFilter: string[] = ['name', 'address.street', 'address.city'];
    const jobLocationsFieldsToFilter: string[] = ['name', 'address.street', 'address.city'];

    const keywordRegex = helper.getRegex(keyword, 'i');
    const contactsIds = filteredInitialTickets.map((value) => value.customerContactId).filter((value) => value !== undefined);
    const customersIds = filteredInitialTickets.map((value) => value.customer).filter((value) => value !== undefined);
    const jobLocationsIds = filteredInitialTickets.map((value) => value.jobLocation).filter((value) => value !== undefined);
    const jobSitesIds = filteredInitialTickets.map((value) => value.jobSite).filter((value) => value !== undefined);
    const techniciansIds = filteredInitialTickets.flatMap((value) => value.tasks?.map((value: any) => value?.technician).filter((value: any) => value !== undefined));
    const homeOwnerIds = filteredInitialTickets.map((value) => value.homeOwner);

    const [filteredCustomersIds, filteredContactsIds, filteredJobLocationsIds, filteredJobSitesIds,
        filteredTechniciansIds, filteredHomwOwnerIds] = await Promise.all([getFilteredCustomerIds(customersIds, keywordRegex),
        _getFilteredContactsIds(contactsIds, keywordRegex),
        getFilteredJobLocationsIds(jobLocationsIds, keywordRegex, jobLocationsFieldsToFilter),
        getFilteredJobSitesIds(jobSitesIds, keywordRegex, jobSitesFieldsToFilter),
        getFilteredTechniciansIds(techniciansIds, keywordRegex),
        _getFilteredHomeOwnersIds(homeOwnerIds, keywordRegex)]);
    const queryOr: any = {
        $or: [
            { ticketId: keywordRegex },
            { note: keywordRegex },
            { customerPO: keywordRegex },
            { dueDate: keywordRegex },
            { customerContactId: { $in: filteredContactsIds } },
            { homeOwner: { $in: filteredHomwOwnerIds } },
            { customer: { $in: filteredCustomersIds } },
            { jobLocation: { $in: filteredJobLocationsIds } },
            { jobSite: { $in: filteredJobSitesIds } },
            { "tasks.technician": { $in: filteredTechniciansIds } },
        ]
    };
    query['$and'].push(queryOr);
    const values = (await ServiceTicket.aggregate([
        { $match: query },
        {
            $project:
            {
                _id: 1
            },
        },
    ])).map((value: any) => value._id);
    return values;
}

