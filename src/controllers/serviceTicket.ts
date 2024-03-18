import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { parseFieldsAndUploadImageInS3, updateFieldsAndUploadImageInS3 } from '../services/aws';
import { _handleJobTypesJson } from '../controllers/item';
import * as helper from '../services/helper';

import { Status, Messages, ServiceTicketStatus, ServiceTicketSource, JobStatus, SocketEvents, DefaultPageSize, JobRequestStatus } from '../common/constants';

import { ICompany } from '../models/Company';
import { IUser } from '../models/User';
import { Contact } from '../models/Contact';
import { Item } from '../models/Item';
import { NotificationTypes } from '../models/Notification';
import { NotificationServiceTicket, INotificationServiceTicket } from '../models/NotificationDiscriminator';
import { IJobTypes } from '../models/JobType';
import { ServiceTicket, IServiceTicket } from '../models/ServiceTicket';
import { JobRequest } from '../models/JobRequest';
import { ITask, Job } from '../models/Job';
import { HomeOwner } from '../models/HomeOwner';
import * as Sentry from '@sentry/node';
import { PORequest } from '../models/PORequest';

export const createServiceTicket = (req: Request, res: Response, sio: any) => {

    parseFieldsAndUploadImageInS3(req, res, async (err: any, data)=>{
        if (!err) {
            const params = data.body;
            let companyId = req.companyId;
            const user = <IUser>req.user;
            const company  = <ICompany>req.company;
            let customerContact = params.customerContactId ? params.customerContactId : null;
            if (customerContact) {
                try {
                    customerContact = new ObjectId(customerContact);
                } catch (e) {
                    Sentry.captureException(e);
                    return res.json({'status': Status.Error, 'message': Messages.WrongId});
                }
            }
            const customerPo = params.customerPO ? params.customerPO : null;
            let customerId: any = null;
            let homeOwnerId: any = null;
            const type = params.type == 'Ticket'  || params.type == 'PO Request' && customerPo ? 'Ticket' : params.type;

            const isHomeOccupied = params.isHomeOccupied === undefined || params.isHomeOccupied === null
                ? false
                : params.isHomeOccupied === 'false'
                    ? false
                    : !!params.isHomeOccupied;

            if (!isHomeOccupied && !params.customerId) {
                return res.json({ status: Status.Error, message: 'Customer is required' });
            }

            if (isHomeOccupied && !params.homeOwnerId) {
                return res.json({ status: Status.Error, message: 'Home Owner is required when home is occupied' });
            }

            if (params.customerId) {
                try {
                    customerId = new ObjectId(params.customerId);
                } catch (e) {
                    Sentry.captureException(e);
                    return res.json({'status': Status.Error, 'message': `parameter customerId: ${Messages.WrongId}`});
                }
            }

            if (isHomeOccupied && params.homeOwnerId) {
                try {
                    const homeOwnerIdParameter = ObjectId.isValid(params.homeOwnerId) ? params.homeOwnerId : new ObjectId(params.homeOwnerId);
                    const homeOwner = await HomeOwner.findById(homeOwnerIdParameter);
                    homeOwnerId = homeOwner._id;
                } catch(error) {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: error.message });    
                }
            }

            //=== HANDLE params jobTypes
            let jobTypes: IJobTypes[], invalidJobTypes: string[];
            try {
                // Call JobType's function to handle Job Types JSON params
                ({ jobTypes, invalidJobTypes } = await _handleJobTypesJson(params.customerId, params.jobTypes, undefined));
            } catch (error) {
                Sentry.captureException(error);
                return res.json({ status: Status.Error, message: error.message });
            }
            //=== END HANDLE params jobTypes

            if(req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId;
            }

            //If the type is 'PO Request,' then set the ticket ID as 'PO Request'
            let ticketType = 'Ticket';
            if (type == 'PO Request') {
                ticketType = 'PO Request';
            }

            let ticketId = `${ticketType} ${company.currentJobId + 1}`;
            if (company.prefix) {
                ticketId = `${ticketType} ${company.prefix}-${company.currentJobId + 1}`;
            }

            // let dueDate = params.dueDate ? new Date(params.dueDate) : null
            const dueDate = params.dueDate ? moment.parseZone(params.dueDate).format('YYYY-MM-DD') : null;

            const newData: any = {
                isHomeOccupied,
                createdAt: Date.now(),
                dueDate: dueDate,
                createdBy: user._id,
                company: companyId,
                note: params.note,
                ticketId: ticketId,
                jobLocation: params.jobLocationId,
                jobSite: params.jobSiteId,
                jobType: params.jobTypeId, // TODO: To be deprecated
                tasks: jobTypes,
                customerPO : customerPo,
                images: [],
                type: type
            };
            let serviceTicket: IServiceTicket;
            //To Detect where the ticket is created from, was it created as a Ticket or a PO Request
            if (type == 'PO Request') {
                newData.PORequestId = ticketId;
                serviceTicket = new PORequest(newData);
            }else{
                serviceTicket = new ServiceTicket(newData);
            }

            serviceTicket.customer = customerId;
            serviceTicket.homeOwner = homeOwnerId;
            serviceTicket.homeJobLocation = params.homeJobLocationId ?? null;
            serviceTicket.homeJobSite = params.homeJobSiteId ?? null;

            if (customerContact) {
                const checkContact = await Contact.findOne({_id: customerContact}).exec();
                if (checkContact) {
                    serviceTicket.customerContactId = checkContact._id;
                }
            }

            if (params.companyLocation) {
                serviceTicket.companyLocation = params.companyLocation;    
            }

            if (params.workType) {
                serviceTicket.workType = params.workType;
            }

            //Retrieve image data from a job when a ticket is created for a partially completed job.
            if (params.jobId) {
                const job = await Job.findOne({_id: params.jobId});
                serviceTicket.images = job.images;
            }

            //Retrieve image data from a job request when a ticket is created for a job request.
            if (params.jobRequestId) {
                const jobRequest = await JobRequest.findOne({_id: params.jobRequestId});
                const images:any = []
                jobRequest?.requests.forEach(request => {
                    const requestImages = request.images?.length ? request?.images : [];
                    images.push(...requestImages);
                });
                serviceTicket.images = images;
                serviceTicket.request = params.jobRequestId;
            }

            data.imagesUrl?.forEach((imageUrl: string) => serviceTicket.images.push({ imageUrl, uploadedBy: user.id, createdAt: new Date() }));
            serviceTicket.source = params.source ? params.source : 'blueclerk';
            await serviceTicket.save(async (err: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                if (params.jobRequestId) {
                    const trackedServiceTicket = [{
                        user: user._id,
                        action: `|Job created by ${user.profile.displayName}|`,
                        date: new Date()
                    }];
                    await JobRequest.findByIdAndUpdate(params.jobRequestId, {
                        ticketCreated: true,
                        job: serviceTicket._id,
                        track: trackedServiceTicket,
                        status: JobRequestStatus.SCHEDULED
                    });
                }

                await company.updateOne({currentJobId: company.currentJobId+1 })
                    .exec(async (err: any)=>{
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError});
                        }

                        let historyMessage = 'Service Ticket';
                        if (type == 'PO Request') {
                            historyMessage  = 'Purchase Order Request';
                        }
                        
                        if (serviceTicket.source === ServiceTicketSource.WEB || serviceTicket.source.includes('partially completed')) {
                            const serviceTicketDetail = await ServiceTicket.findOne(
                                { _id: serviceTicket._id , company: companyId})
                                .populate({
                                    path: 'customer',
                                    select: 'info.email profile.displayName contactName'
                                })
                                .populate({
                                    path: 'homeOwner',
                                    select: 'info profile address location contact'
                                })
                                .populate({
                                    path: 'createdBy',
                                    select: 'profile.displayName'
                                })
                                .populate({
                                    path: 'technician',
                                    select: 'profile.displayName'
                                })
                                .populate({
                                    path: 'editedBy',
                                    select: 'profile.displayName'
                                })
                                .exec(async (err: any, serviceTicket: IServiceTicket) => {
                                    if(err) {
                                        return null;
                                    }
                                                            
                                    // Construct notification entry to be saved
                                    const notificationEntry: INotificationServiceTicket = new NotificationServiceTicket({
                                        company: companyId,
                                        notificationType: NotificationTypes.SERVICE_TICKET_CREATED,
                                        message: {
                                            title: `${historyMessage} created`,
                                            body: `${serviceTicket.ticketId} created via web`
                                        },
                                        metadata: serviceTicket._id
                                    });

                                    // Save the notification with Service Ticket as the metadata
                                    notificationEntry.save(async (err: any, notification: INotificationServiceTicket) => {
                                        if (err) {
                                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                                        }

                                        await notification.populate('metadata').execPopulate();
                                        await sio.to(companyId && companyId.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);
                                    });
                                }
                                );

                        }
                        return res.json({'status': Status.Success, 'message': `${historyMessage} created successfully.`, invalidJobTypes , createdID : serviceTicket._id});
                    });
            });

        } else {
            return res.json({'status': Status.Error, 'message': err.message});
        }
    });
};

/**
 * Reusable create Service Ticket function to be used anywhere
 */
export const _createServiceTicket = async (req: Request, res: Response, next: (err: any, serviceTicket: IServiceTicket) => void) => {

    const params = req.body;
    let serviceTicket: IServiceTicket;

    // Check if customerContactId, customerId & itemId is a valid Object ID if provided
    if (params.customerContactId && !ObjectId.isValid(params.customerContactId)) {
        return next(`parameter customerContactId: ${Messages.WrongId}`, null);
    }
    if (params.customerId && !ObjectId.isValid(params.customerId)) {
        return next(`parameter customerId: ${Messages.WrongId}`, null);
    }
    if (params.itemId && !ObjectId.isValid(params.itemId)) {
        return next(`parameter itemId: ${Messages.WrongId}`, null);
    }

    //=== HANDLE params jobTypes
    let jobTypes: IJobTypes[], invalidJobTypes: string[];
    try {
        // Call JobType's function to handle Job Types JSON params
        ({ jobTypes, invalidJobTypes } = await _handleJobTypesJson(params.customerId, params.jobTypes, undefined));
    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: error.message });
    }
    //=== END HANDLE params jobTypes

    try {

        const user = <IUser>req.user;
        const company = <ICompany>req.company;
        const companyId = req.otherCompanyId || req.companyId;
        const customerContact = await Contact.findById(new ObjectId(params.customerContactId));
        const customerPo = params.customerPO || null;
        const customerId = new ObjectId(params.customerId);
        let ticketId = `Ticket ${company.currentJobId + 1}`;
        if (company.prefix) {
            ticketId = `Ticket ${company.prefix}-${company.currentJobId + 1}`;
        }
        // const dueDate = params.dueDate ? new Date(params.dueDate) : null;
        const dueDate = params.dueDate ? moment(params.dueDate).format('YYYY-MM-DD') : null;
        let note: string = params.note ? `${params.note} ` : '';
        if (typeof params.warranty === typeof Boolean) {
            note += note ? ' || ' : '';
            note += params.warranty ? 'Warranty: yes' : 'Warranty: no';
        } else if (params.warranty == 'true') {
            note += note ? ' || ' : '';
            note += 'Warranty: yes';
        } else if (params.warranty == 'false') {
            note += note ? ' || ' : '';
            note += 'Warranty: no';
        }
        if (params.workToBeDone) {
            note += note ? ' || ' : '';
            note += `Work to be done: ${params.workToBeDone}`;
        }
        if (params.preferredDateTime) {
            note += note ? ' || ' : '';
            note += `Preferred Date Time: ${params.preferredDateTime}`;
        }

        // Get Job Type from the Item selected
        const item = params.itemId ? await Item.findById(params.itemId) : null;

        // Construct the service ticket entry
        serviceTicket = new ServiceTicket({
            createdAt: Date.now(),
            dueDate: dueDate,
            createdBy: user._id,
            company: companyId,
            note,
            technician: params.technicianId,
            ticketId: ticketId,
            jobLocation: params.jobLocationId,
            jobSite: params.jobSiteId,
            jobType: params.jobTypeId || item && item.jobType, // TODO: To be deprecated
            item: params.itemId,
            customerPO: customerPo,
            customer: customerId,
            customerContactId: customerContact && customerContact._id,
            image: params.image,
            source: params.source || 'blueclerk'
        });

        // Save service ticket and company
        company.currentJobId += 1;
        await serviceTicket.save();
        await company.save();

    } catch (error) {
        Sentry.captureException(error);
        return next(error, null);
    }

    return next(null, serviceTicket);

};

export const getServiceTickets = async (req: Request, res: Response) => {

    const params = req.body;
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;
    let companyId = req.companyId;
    let technicianIds: any[];

    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }

    // Return error when all cursors are provided
    if (params.nextCursor && params.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }

    const filterQuery: any = {
        $and: [{
            $or: [
                { company: companyId }
            ]
        }]
    };

    // Check and add if params filter provided
    if (params.keyword) {
        const keywordRegex = { $regex: params.keyword, $options: 'i' };
        filterQuery['$and'].push({
            $or: [
                { ticketId: keywordRegex },
                { note: keywordRegex },
                { customerPO: keywordRegex },
                { dueDate: keywordRegex },
                { 'customerObj.profile.displayName': keywordRegex },
                { 'customerContactIdObj.name': keywordRegex },
                { 'homeOwnerObj.profile.displayName': keywordRegex },
                { 'jobLocationObj.name': keywordRegex },
                { 'jobLocationObj.address.street': keywordRegex },
                { 'jobLocationObj.address.city': keywordRegex },
                { 'jobSiteObj.name': keywordRegex },
                { 'jobSiteObj.address.street': keywordRegex },
                { 'jobSiteObj.address.city': keywordRegex },
                { 'technicianObj.profile.displayName': keywordRegex },
            ]
        });
    }
    if (params.technicianIds) {
        // Validate is technician ids is already array or object
        technicianIds = Array.isArray(params.technicianIds)
            ? params.technicianIds
            : params.technicianIds.split(',').filter((element: any) => element);
    }

    if (technicianIds?.length) {
        // convert technician Id from string to objectId and remove falsy value 
        const technicians = technicianIds.map(technicianId => {
            if (ObjectId.isValid(technicianId)) return new ObjectId(technicianId);
        }).filter(tech => tech);
        filterQuery['$and'].push({
            $or: [
                { 'tasks.technician': { $in: technicians } },
                { 'tasks.contractor': { $in: technicians } }
            ]
        });
    }

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {}
        filterQuery['$and'].push({ workType: { $in : workTypeIds }});
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {}
        filterQuery['$and'].push({ companyLocation: { $in : companyLocationIds }});
    }

    if (params.status == 0) {
        filterQuery['$and'].push({status: {$ne: 1}});
        filterQuery['$and'].push({jobCreated: false});
    }
    else if(params.status == 1)
    {
        filterQuery['$and'].push(
            {$or: [
                {
                    $and: [
                        {status: {$ne: 1}}
                    ]
                },
                {
                    $and: [
                        {status: 1},
                        {jobCreated: true}
                    ]
                },
            ]});
    }
    if (params.startDate && params.endDate) {
        const startDate = moment(params.startDate).format('YYYY-MM-DD');
        const endDate = moment(params.endDate).format('YYYY-MM-DD');
        filterQuery['$and'].push({ dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } });
    }
    if (params.customerId) {
        filterQuery['$and'].push({ customer: new ObjectId(params.customerId) });
    }

    // Deep clone filterQuery
    const query: any = { $and: [] };
    filterQuery['$and'].map((q: any) => { query['$and'].push({ ...q }); });
    // Pagination query that default to nothing
    let paginationQuery = {};
    // Sort query that default to sort by the recent ones
    let sortQuery = { createdAt: -1, _id: -1 };

    if (params.nextCursor) {
        // Update pagination query to get the next page
        const cursor = JSON.parse(helper.fromCursorHash(params.nextCursor));
        const cursorId = ObjectId.isValid(cursor._id) ? new ObjectId(cursor._id) : null;
        paginationQuery = {
            $or: [
                { createdAt: { $lt: new Date(cursor.updatedAt) } },
                { createdAt: new Date(cursor.updatedAt), _id: { $lt: cursorId } }
            ]
        };
        query['$and'].push({ ...paginationQuery });
    }
    if (params.previousCursor) {
        // Update pagination query to get the previous page
        const cursor = JSON.parse(helper.fromCursorHash(params.previousCursor));
        const cursorId =
         ObjectId.isValid(cursor._id) ? new ObjectId(cursor._id) : null;
        paginationQuery = {
            $or: [
                { createdAt: { $gt: new Date(cursor.updatedAt) } },
                { createdAt: new Date(cursor.updatedAt), _id: { $gt: cursorId } }
            ]
        };
        query['$and'].push({ ...paginationQuery });
        // Getting previous page is special, we need to reverse the sort
        sortQuery = { createdAt: 1, _id: 1 };
    }

    // Construct aggreate lookups here to be used multiple times
    const aggregateLookups = [
        { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customerObj' } },
        { $lookup: { from: 'joblocations', localField: 'jobLocation', foreignField: '_id', as: 'jobLocationObj' } },
        { $lookup: { from: 'jobsites', localField: 'jobSite', foreignField: '_id', as: 'jobSiteObj' } },
        { $lookup: { from: 'users', localField: 'tasks.technician', foreignField: '_id', as: 'technicianObj' } },
        { $lookup: { from: 'companies', localField: 'tasks.contractor', foreignField: '_id', as: 'contractorsObj' } },
        { $lookup: { from: 'contacts', localField: 'customerContactId', foreignField: '_id', as: 'customerContactIdObj' } }
    ];

    // Filter jobs using aggregate to be search to another collection
    const serviceTicketsAggregate: IServiceTicket[] = await ServiceTicket.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        { $project: { _id: 1, createdAt: 1 } },
        { $sort: sortQuery },
        { $limit: Number(params.pageSize) || DefaultPageSize }
    ]);
    // Map the Job IDs filtered
    const serviceTicketIds = serviceTicketsAggregate.map((serviceTicket) => serviceTicket._id);

    ServiceTicket.find({ _id: { $in: serviceTicketIds } })
        .sort({ ...sortQuery })
        .populate({
            path: 'customer',
            select: 'info.email profile.displayName contactName',
        })
        .populate({
            path: 'homeOwner',
            select: 'info profile address location contact'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'editedBy',
            select: 'profile.displayName'
        })
        .exec(async (err: any, serviceTickets: IServiceTicket[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            // Because we reverse sort for previous page, we need to revert it back
            if (params.previousCursor) {
                serviceTickets = serviceTickets.reverse();
            }

            /**
             * Get all total jobs count
             */
            const totalServiceTickets = await ServiceTicket.aggregate([
                ...aggregateLookups,
                { $match: { ...filterQuery } },
                { $count: 'count' }
            ]);

            /**
             * Check if next page is available
             */
            const nextCursor = { updatedAt: serviceTickets[serviceTickets.length - 1]?.createdAt, _id: serviceTickets[serviceTickets.length - 1]?._id };
            // Deep clone filterQuery
            const nextPageQuery: any = { $and: [] };
            filterQuery['$and'].map((q: any) => { nextPageQuery['$and'].push({ ...q }); });
            // To be added with the pagination for the previous page
            nextPageQuery['$and'].push({
                $or: [
                    { createdAt: { $lt: new Date(nextCursor.updatedAt) } },
                    { createdAt: new Date(nextCursor.updatedAt), _id: { $lt: nextCursor._id } }
                ]
            });
            const isNextPage = await ServiceTicket.aggregate([
                ...aggregateLookups,
                { $match: { ...nextPageQuery } },
                { $project: { _id: 1, createdAt: 1 } },
                { $sort: { createdAt: -1, _id: -1 } },
                { $limit: 1 }
            ]);

            /**
             * Check if previous page is availabe
             */
            const previousCursor = { updatedAt: serviceTickets[0]?.createdAt, _id: serviceTickets[0]?._id };
            // Deep clone filterQuery
            const previousPageQuery: any = { $and: [] };
            filterQuery['$and'].map((q: any) => { previousPageQuery['$and'].push({ ...q }); });
            // To be added with the pagination for the previous page
            previousPageQuery['$and'].push({
                $or: [
                    { createdAt: { $gt: new Date(previousCursor.updatedAt) } },
                    { createdAt: new Date(previousCursor.updatedAt), _id: { $gt: previousCursor._id } }
                ]
            });
            const isPreviousPage = await ServiceTicket.aggregate([
                ...aggregateLookups,
                { $match: { ...previousPageQuery } },
                { $project: { _id: 1, createdAt: 1 } },
                { $sort: { createdAt: 1, _id: 1 } },
                { $limit: 1 }
            ]);
            return res.json({
                status: Status.Success,
                serviceTickets: serviceTickets,
                total: totalServiceTickets[0]?.count,
                nextCursor: isNextPage.length ? helper.toCursorHash(JSON.stringify(nextCursor)) : null,
                previousCursor: isPreviousPage.length ? helper.toCursorHash(JSON.stringify(previousCursor)) : null
            });
        }
        );

};

export const getOpenServiceTickets = (req: Request, res: Response) => {

    const params = req.body;
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    let contactName: any;
    let companyId = req.companyId;
    let serviceTickets : any = [];
    let totalCount  = 0;
    let customerNames: any;
    let homeOwnerNames: any;

    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }

    if (params.customerNames) {
        customerNames = Array.isArray(params.customerNames)
            ? params.customerNames
            : params.customerNames.split(',').filter((element: any) => element);
    }

    if (params.homeOwnerNames) {
        // Check is homeOwnerNames is already array or not, and remove the falsy value
        homeOwnerNames = Array.isArray(params.homeOwnerNames)
            ? params.homeOwnerNames
            : params.homeOwnerNames.split(',').filter((element: any) => element);
    }

    let criteria: any = {
        company: companyId,
        jobCreated: false,
        status: { '$in': [ServiceTicketStatus.ACTIVE, ServiceTicketStatus.REACTIVE] }
    };

    if (params.contactName) {
        contactName = params.contactName;
        criteria['customerContactId.name'] = contactName;
    }


    if (params.jobTypeTitle) {
        criteria['jobType.title'] = params.jobTypeTitle;
    }

    if (params.dueDate) {
        // Retrieve the dueDate using Moment in UTC format
        const startOfDay = moment(params.dueDate).startOf('day').utc().format();
        const endOfDay = moment(params.dueDate).endOf('day').utc().format();
        const dueDate = moment(params.dueDate).format('YYYY-MM-DD');

        // Convert back the date to ISODate using new Date()
        // criteria.dueDate = { '$gte': new Date(startOfDay), '$lte': new Date(endOfDay) };
        const dueDateQuery = {
            '$or': [
                { dueDate: new Date(dueDate) },
                { dueDate: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) } }]
        };
        Object.assign(criteria, dueDateQuery);
    }

    if (params.ticketId) {
        let ticketId = params.ticketId;
        if (ticketId.match(/\d/g)) {
            ticketId = 'Ticket '+ticketId.match(/\d/g).join('');
        }
        criteria.ticketId = { $regex: ticketId, $options: 'i'};
    }

    if(customerNames?.length) {
        criteria['customer.profile.displayName'] = { $in: customerNames };
    }

    if (homeOwnerNames?.length) {
        criteria['homeOwner.profile.displayName'] = { $in: homeOwnerNames };
    }

    if (homeOwnerNames?.length && customerNames?.length) {
        criteria = {
            $or: [
                {'homeOwner.profile.displayName': { $in: homeOwnerNames}}, 
                {'customer.profile.displayName': { $in: customerNames }}
            ]
        };
    }

    const Query = ServiceTicket.aggregate([
        {
            $lookup: {
                from: 'customers',
                localField: 'customer',
                foreignField: '_id',
                as: 'customer'
            }
        },
        {
            $lookup: {
                from: 'homeowners',
                localField: 'homeOwner',
                foreignField: '_id',
                as: 'homeOwner'
            }
        },
        {
            $lookup: {
                from: 'jobsites',
                localField: 'jobSite',
                foreignField: '_id',
                as: 'jobSite'
            }
        },
        {
            $lookup: {
                from: 'joblocations',
                localField: 'jobLocation',
                foreignField: '_id',
                as: 'jobLocation'
            }
        },
        {
            $lookup: {
                from: 'jobtypes',
                localField: 'tasks.jobType',
                foreignField: '_id',
                as: 'tasks'
            }
        },
        {
            $lookup: {
                from: 'jobtypes',
                localField: 'jobType',
                foreignField: '_id',
                as: 'jobType'
            }
        },
        {
            $lookup: {
                from: 'companies',
                localField: 'company',
                foreignField: '_id',
                as: 'companyInfo'
            }
        },
        { '$match': criteria },
        {
            $project: {
                '_id': 1,
                'customer': {$arrayElemAt:['$customer',0]},
                'homeOwner': {$arrayElemAt:['$homeOwner',0]},
                'jobSite': {$arrayElemAt:['$jobSite',0]},
                'jobLocation': {$arrayElemAt:['$jobLocation',0]},
                'tasks': 1,
                'jobType': {$arrayElemAt:['$jobType',0]},
                'company.info':{$arrayElemAt:['$companyInfo.info',0]},
                'status' : 1,
                'jobCreated' : 1,
                'dueDate' : 1,
                'note': 1,
                'image': 1,
                'customerPO': 1,
                'customerContactId': 1,
                'ticketId': 1,
                'createdAt' : 1
            }
        },
        { $sort: { _id: -1 } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                serviceTickets: {
                    $push: '$$ROOT'
                }
            }
        },
        {
            $project: {
                total:1,
                serviceTickets: {$slice: ['$serviceTickets', pageSize * (currentPage - 1), pageSize]}
            }
        },
    ]);

    Query.then((documents: any[]) => {
        if (documents.length > 0) {
            serviceTickets = documents[0].serviceTickets;
            totalCount = documents[0].total;
        }
        return res.json({'status': Status.Success, 'serviceTickets': serviceTickets , 'total': totalCount });
    }).catch((err:any) => {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    });
};

export const getOpenServiceTicketsStream = async (req: Request, res: Response, sio: any) => {

    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    const actionId = req.query.actionId;
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;
    const includeOpenJobRequest = req.query.includeOpenJobRequest || false;

    // Initialize started count & total of the service tickets
    let count = 1;

    const filterByDivision: any = {};

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {}
        filterByDivision['workType'] = { $in : workTypeIds };
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {}
        filterByDivision['companyLocation'] = { $in : companyLocationIds };
    }

    const totalServiceTickets = await ServiceTicket.find({
        company: company._id,
        jobCreated: false,
        type: { $ne: 'PO Request' },
        status: { $in: [ServiceTicketStatus.ACTIVE, ServiceTicketStatus.REACTIVE] },
        ...filterByDivision
    }).countDocuments();

    let totalJobRequests = 0;
    if (includeOpenJobRequest) {
        // Get total of job requests
        totalJobRequests = await JobRequest.find({
            company: company._id,
            status: { $in: [JobRequestStatus.PENDING] },
        }).countDocuments();
    }
    const grandTotal = totalServiceTickets + totalJobRequests;

    // Return the HTTP request directly to avoid timed-out issue
    res.json({
        status: Status.OK,
        totalServiceTickets,
        totalJobRequests,
        total: grandTotal,
        message: `All open service tickets${includeOpenJobRequest ? ' and pending job reqests' : ''} will be returned to Socket.io, make sure to listen to event 'all_open_service_tickets'`
    });

    /**
     * Retrieve all open service tickets with all populated info,
     * and return it as a stream via socket.io
     */
    const serviceTicketCursor = ServiceTicket.find({
        company: company._id,
        jobCreated: false,
        type: { $ne: 'PO Request' },
        status: { $in: [ServiceTicketStatus.ACTIVE, ServiceTicketStatus.REACTIVE] },
        ...filterByDivision
    }).sort({ _id: -1 })
        .populate({ path: 'company', select: 'info address contact' })
        .populate({ path: 'customer', select: 'info profile address location contact' })
        .populate({ path: 'homeOwner', select: 'info profile address location contact' })
        .populate({ path: 'customerContactId', select: '-__v' })
        .populate({ path: 'jobLocation', select: 'name address location' })
        .populate({ path: 'jobSite', select: 'name address location' })
        .populate({ path: 'tasks.jobType', select: 'title description sku' })
        .cursor();

    // Iterate all the cursor and send it to company's room socket.io
    for (let serviceTicket = await serviceTicketCursor.next(); serviceTicket != null; serviceTicket = await serviceTicketCursor.next()) {
        // Set roomId for terminating socket connection
        const roomId = actionId?.toString() || company._id?.toString() + user._id?.toString();
        const clientExist = sio.sockets?.adapter?.rooms?.get(roomId);
        if(!clientExist){
            // Client disconnect, stop sending data
            break;
        }

        if (actionId) {
            /**
             * New way, get actionID from FE and send it privately,
             * Send the service ticket via socket.io
             */
            await sio.to(actionId?.toString()).emit(SocketEvents.ALL_OPEN_SERVICE_TICKETS, {
                serviceTicket,
                count: count++,
                totalServiceTickets,
                totalJobRequests,
                total: grandTotal,
            });
        } else {
            /**
             * Old way, sending to room and disconnect,
             * Send the service ticket via socket.io
             */
            await sio.to(company._id?.toString() + user._id?.toString()).emit(SocketEvents.ALL_OPEN_SERVICE_TICKETS, {
                serviceTicket,
                count: count++,
                totalServiceTickets,
                totalJobRequests,
                total: grandTotal,
            });
        }

    }

    // Sending job request stream if includeOpenJobRequest = true
    if (includeOpenJobRequest) {
        /**
         * Retrieve all job requests with all populated info,
         * and return it as a stream via socket.io
         */
        const jobRequestCursor = JobRequest.find({
            company: company._id,
            status: { $in: [JobRequestStatus.PENDING] }
        }).sort({ _id: -1 })
            .populate({ path: 'company', select: 'info address contact' })
            .populate({ path: 'customer', select: 'info profile address location contact' })
            .populate({
                path: 'homeOwner',
                select: 'info profile address location contact'
            })
            .populate({ path: 'customerContact', select: 'info profile address contact' })
            .populate({ path: 'jobLocation', select: 'name address location' })
            .populate({ path: 'jobSite', select: 'name address location' })
            .cursor();

        // Iterate all the cursor and send it to company's room socket.io
        for (let jobRequest = await jobRequestCursor.next(); jobRequest != null; jobRequest = await jobRequestCursor.next()) {
            // Set roomId for terminating socket connection
            const roomId = actionId?.toString() || company._id?.toString() + user._id?.toString();
            const clientExist = sio.sockets?.adapter?.rooms?.get(roomId);
            if (!clientExist) {
                // Client disconnect, stop sending data
                break;
            }

            if (actionId) {
                /**
                 * New way, get actionID from FE and send it privately,
                 * Send the job request via socket.io
                 */
                await sio.to(actionId?.toString()).emit(SocketEvents.ALL_OPEN_SERVICE_TICKETS, {
                    jobRequest,
                    count: count++,
                    totalServiceTickets,
                    totalJobRequests,
                    total: grandTotal,
                });
            } else {
                /**
                 * Old way, sending to room and disconnect,
                 * Send the job request via socket.io
                 */
                await sio.to(company._id?.toString() + user._id?.toString()).emit(SocketEvents.ALL_OPEN_SERVICE_TICKETS, {
                    jobRequest,
                    count: count++,
                    totalServiceTickets,
                    totalJobRequests,
                    total: grandTotal,
                });
            }
        }
    }

    return;

};

export const updateServiceTicket = (req: Request, res: Response) => {
    const user = <IUser>req.user;
    updateFieldsAndUploadImageInS3(req, res, async (err: any, data)=>{
        if (!err) {
            const params = data.body;
            let customerContact = params.customerContactId ? params.customerContactId : null;
            if (customerContact) {
                try {
                    customerContact = new ObjectId(customerContact);
                } catch (e) {
                    Sentry.captureException(e);
                    return res.json({'status': Status.Error, 'message': Messages.WrongId});
                }
            }
            let companyId = req.companyId;
            if(req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId;
            }

            ServiceTicket.findOne(
                { _id: params.ticketId , company: companyId},
                async (err: any, serviceTicket: IServiceTicket)=>{

                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }
                    if (!serviceTicket) {
                        return res.json({ status: Status.Error, message: 'Service ticket not found or you are unauthorized to update this service ticket' });
                    }
                    const status = params.status ? params.status : serviceTicket.status;
                    let action = '';

                    const track: any[] = serviceTicket?.track ? serviceTicket.track : [];
                    if(params.status) {
                        if (params.status == ServiceTicketStatus.ARCHIVED) {
                            action = '|Ticket archived|';
                        }
                        if (params.status == ServiceTicketStatus.REACTIVE) {
                            action = '|Ticket reactivated|';
                        }

                    }
                    if (serviceTicket.status == ServiceTicketStatus.ARCHIVED && status == ServiceTicketStatus.ARCHIVED) {
                        return res.json({'status': Status.Error, 'message': 'Ticket is archived'});
                    }

                    let dueDate: any = serviceTicket.dueDate;
                    if(params.dueDate) {
                        // dueDate = new Date(params.dueDate)
                        dueDate = moment(params.dueDate).format('YYYY-MM-DD');
                    }
                    data.imagesUrl.forEach((imageUrl: string) => {
                        serviceTicket.images ? serviceTicket.images.push({ imageUrl, uploadedBy: user.id ,createdAt: new Date() })
                            : [];
                    });

                    const customerPO = params.customerPO ?? null;

                    const customerContactId = customerContact ?? null;

                    const customer = params.customerId ? new ObjectId(params.customerId) : serviceTicket.customer;

                    const jobLocationId: any = params.jobLocationId ?? null;

                    const jobSiteId: any = params.jobSiteId ?? null;

                    let jobTypeId: any = serviceTicket.jobType;
                    if (params.jobTypeId) {
                        jobTypeId = params.jobTypeId;
                    }
                    const type = params.type;

                    // Update isHomeOccupied and or homeOwner
                    const isHomeOccupied = params.isHomeOccupied
                        || params.isHomeOccupied === false 
                        || params.isHomeOccupied === true 
                        ? params.isHomeOccupied 
                        : serviceTicket.isHomeOccupied;
                    
                    let homeOwnerId = params.homeOwnerId ? new ObjectId(params.homeOwnerId) : serviceTicket.homeOwner;
                    
                    if(isHomeOccupied && (isHomeOccupied === true || isHomeOccupied === 'true')) {
                        if(params.homeOwnerId) {
                            const newHomeOwner = await HomeOwner.findOne({ _id: params.homeOwnerId });
                            if(!newHomeOwner) {
                                return res.json({ 'status': Status.NotFound, 'message': 'Provided homeOwnerId does not correspond with any home owner' });
                            }
                        }
                        else {
                            if(isHomeOccupied && !serviceTicket.homeOwner) {
                                return res.json({ 'status': Status.Error, 'message': 'Home Owner is required when home is occupied' });
                            }
                        }
                    }
                    else {
                        homeOwnerId = null;
                    }

                    //=== HANDLE params jobTypes
                    const currentJobTypes = serviceTicket.tasks;
                    let jobTypes: IJobTypes[], invalidJobTypes: string[];
                    let isJobTypesUpdated = false;
                    try {
                        // Call JobType's function to handle Job Types JSON params
                        ({ jobTypes, invalidJobTypes } = await _handleJobTypesJson(customer.toString(), params.jobTypes, currentJobTypes));
                    } catch (error) {
                        Sentry.captureException(error);
                        return res.json({ status: Status.Error, message: error.message });
                    }
                    // Check if jobTypes changed or not
                    if (JSON.stringify(currentJobTypes) !== JSON.stringify(jobTypes)) {
                        action += '|Updated JobTypes|';
                        isJobTypesUpdated = true;
                    }
                    // If job types changed, check if there any running jobs
                    if (isJobTypesUpdated) {
                        const jobs = await Job.find({ ticket: serviceTicket._id });
                        if (jobs.find(job => job.status !== JobStatus.PENDING && job.status !== JobStatus.RESCHEDULED && job.status !== JobStatus.CANCELED)) {
                            return res.json({ status: Status.Error, message: 'Cannot update ticket when tied to a job in progress' });
                        }
                    }
                    //=== END HANDLE params jobTypes

                    if (
                        serviceTicket.dueDate != params.dueDate ||
                        JSON.stringify(serviceTicket.images) != JSON.stringify(data.imagesUrl) ||
                        params.customerPO != serviceTicket.customerPO ||
                        serviceTicket.customerContactId != customerContactId ||
                        params.jobLocationId != serviceTicket.jobLocation ||
                        params.jobSiteId != serviceTicket.jobSite ||
                        params.jobTypeId || serviceTicket.jobType
                    ) {
                        action += '|Ticket info updated|';
                    }
                    if (action !== '') {
                        track.push({
                            user: user._id,
                            action,
                            date: new Date()
                        });
                    }

                    if (type === 'Ticket' && serviceTicket.ticketId.includes('PO Request')) {
                        serviceTicket.ticketId = serviceTicket.ticketId?.replace('PO Request','Ticket');
                    } 

                    serviceTicket.updateOne(
                        {
                            note: params.note,
                            dueDate: dueDate,
                            jobLocation: jobLocationId,
                            jobSite: jobSiteId,
                            jobType: jobTypeId, // TODO: To be deprecated
                            tasks: jobTypes,
                            images: serviceTicket.images,
                            customerPO: customerPO,
                            customerContactId: customerContactId,
                            customer: customer,
                            status: status,
                            track: track,
                            isHomeOccupied: isHomeOccupied,
                            homeOwner: homeOwnerId,
                            ticketId: serviceTicket.ticketId,
                            type
                        },
                        async (err: any)=> {

                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError});
                            }

                            if (!serviceTicket.customerPO && customerPO) {
                                const track: any[] = serviceTicket?.track ? serviceTicket.track : [];
                                track.push({
                                    user: user._id,
                                    action: 'Override-missing Customer PO',
                                    date: new Date()
                                });
                                serviceTicket.type = 'Ticket';
                                serviceTicket.ticketId = serviceTicket.ticketId?.replace('PO Request','Ticket');
                                serviceTicket.poOverriddenBy = user._id;
                                await serviceTicket.save();
                            }else if(serviceTicket.customerPO != customerPO){
                                const track: any[] = serviceTicket?.track ? serviceTicket.track : [];
                                track.push({
                                    user: user._id,
                                    action: 'Updated Customer PO',
                                    date: new Date()
                                });
                                await serviceTicket.save();
                            }
                            // Update jobs related to this service ticket is jobTypes updated
                            const jobs = await Job.find({ ticket: serviceTicket._id });
                            for (const job of jobs) {
                                // Update job's track
                                const jobTrack = job.track;
                                jobTrack.push({
                                    user: user._id,
                                    action: '|Updated JobTypes|',
                                    date: new Date()
                                });
                                // Update Job data for these disable data for Job
                                job.customerContactId = customerContactId;
                                job.customerPO = customerPO;
                                job.track = jobTrack;
                                // Kris remark (Nov 19th, 2021):
                                // To update job new task when task in Service Ticket updated?
                                // if (isJobTypesUpdated) {
                                //     job.tasks.forEach(task => {
                                //         task.jobTypes = <ITask[]>jobTypes;
                                //     });
                                // }
                                // Save the job
                                job.save();
                            }

                            return res.json({'status': Status.Success, 'message': `${serviceTicket.type} updated successfully.`, invalidJobTypes});
                        }
                    );
                }
            );
        } else {
            return res.json({'status': Status.Error, 'message': err.message});
        }
    });
};

export const editServiceTicket = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }

    ServiceTicket.findOne(
        { _id: params.ticketId , company: companyId},
        (err: any, serviceTicket: IServiceTicket)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            let action = '';

            const track: any[] = serviceTicket?.track ? serviceTicket.track : [];
            if(params.status) {
                if (params.status == ServiceTicketStatus.ARCHIVED) {
                    action = 'archived the ticket';
                }
                if (params.status == ServiceTicketStatus.REACTIVE) {
                    action = 'reactivated the ticket';
                }
                if (params.status === ServiceTicketStatus.ACTIVE && params.status != serviceTicket.status) {
                    action = 'reactivated the ticket';
                }
            }
            track.push({
                user: user._id,
                action,
                date: new Date()
            });

            if(params.status != ServiceTicketStatus.ARCHIVED && params.status != ServiceTicketStatus.ACTIVE && params.status != ServiceTicketStatus.REACTIVE ) {
                return res.json({'status': Status.Error, 'message': 'Invalid ticket status'});
            }

            serviceTicket.updateOne(
                {status: params.status, editedBy: user._id, editedAt: Date.now(), track: track },
                (err: any)=> {

                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }

                    return res.json({'status': Status.Success, 'message': 'Ticket status changed successfully.'});
                }
            );
        }
    );
};


export const getServiceTicketDetail = (req: Request, res: Response) => {

    const params = req.body;

    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }

    ServiceTicket.findOne(
        { _id: params.ticketId , company: companyId})
        .populate({
            path: 'customer',
            select: 'info.email profile.displayName contactName'
        })
        .populate({
            path: 'homeOwner',
            select: 'info profile address location contact'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'editedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'jobLocation',
            select: 'name'
        })
        .populate({
            path: 'jobSite',
            select: 'name'
        })
        .populate({
            path: 'jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'item',
            select: 'name description sku'
        })
        .populate({
            path: 'tasks.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'track.user',
            select: 'profile.displayName'
        })
        .populate({
            path: 'customerContactId',
            select: 'name'
        })
        .exec((err: any, serviceTicket: IServiceTicket)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            return res.json({'status': Status.Success, 'serviceTicket': serviceTicket});
        }
        );
};
