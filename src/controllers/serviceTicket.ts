import {Request, Response} from 'express'
import { Status, Messages, ServiceTicketStatus, ServiceTicketSource, SocketEvents, NotificationTypes } from '../common/constants'

import { ICompany } from '../models/Company'
import { ServiceTicket, IServiceTicket } from '../models/ServiceTicket'
import {IUser} from '../models/User'
import {parseFieldsAndUploadImageInS3, updateFieldsAndUploadImageInS3} from '../services/aws';
import { ObjectId } from 'mongodb'
import {Contact} from '../models/Contact';
import { Item } from '../models/Item'
import { NotificationServiceTicket, INotificationServiceTicket } from '../models/NotificationServiceTicket';
import { IJobTypes } from '../models/JobType'
import { Job } from '../models/Job';
import { _handleJobTypesJson } from '../controllers/jobType';

export const createServiceTicket = (req: Request, res: Response, sio: any) => {

    parseFieldsAndUploadImageInS3(req, res, async (err: any, data)=>{
        if (!err) {
            const params = data.body
            let companyId = req.companyId;
            let user = <IUser>req.user;
            let company  = <ICompany>req.company;
            let customerContact = params.customerContactId ? params.customerContactId : null
            if (customerContact) {
                try {
                    customerContact = new ObjectId(customerContact);
                } catch (e) {
                    return res.json({'status': Status.Error, 'message': Messages.WrongId});
                }
            }
            let customerPo = params.customerPO ? params.customerPO : null;
            let customerId: any = null;
            if (params.customerId) {
                try {
                    customerId = new ObjectId(params.customerId)
                } catch (e) {
                    return res.json({'status': Status.Error, 'message': Messages.WrongId});
                }
            }

            //=== HANDLE params jobTypes
            let jobTypes: IJobTypes[], invalidJobTypes: string[];
            try {
                // Call JobType's function to handle Job Types JSON params
                ({ jobTypes, invalidJobTypes } = await _handleJobTypesJson(params.customerId, params.jobTypes, undefined));
            } catch (error) {
                return res.json({ status: Status.Error, message: error.message });
            }
            //=== END HANDLE params jobTypes

            if(req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId
            }
            let ticketId = `Ticket ${company.currentJobId + 1}`;
            if (company.prefix) {
                ticketId = `Ticket ${company.prefix}-${company.currentJobId + 1}`;
            }

            let dueDate = params.dueDate ? new Date(params.dueDate) : null
            let serviceTicket = new ServiceTicket({
                createdAt: Date.now(),
                dueDate: dueDate,
                createdBy: user._id,
                company: companyId,
                note: params.note,
                technician: params.technicianId,
                ticketId: ticketId,
                jobLocation: params.jobLocationId,
                jobSite: params.jobSiteId,
                jobType: params.jobTypeId, // TODO: To be deprecated
                tasks: jobTypes,
                customerPO : customerPo,
            });
            if (customerId) {
                serviceTicket.customer = customerId;
            }
            if (customerContact) {
                let checkContact = await Contact.findOne({_id: customerContact}).exec();
                if (checkContact) {
                    serviceTicket.customerContactId = checkContact._id;
                }
            }
            serviceTicket.image = data.imageUrl ? data.imageUrl : null;
            serviceTicket.source = params.source ? params.source : 'blueclerk';
            await serviceTicket.save(async (err: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                await company.updateOne({currentJobId: company.currentJobId+1 })
                    .exec(async (err: any)=>{
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }

                        if (serviceTicket.source === ServiceTicketSource.WEB) {
                            const serviceTicketDetail = await ServiceTicket.findOne(
                                { _id: serviceTicket._id , company: companyId})
                                .populate({
                                    path: 'customer',
                                    select: 'info.email profile.displayName contactName'
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
                                    let notificationEntry: INotificationServiceTicket = new NotificationServiceTicket({
                                        company: companyId,
                                        notificationType: NotificationTypes.SERVICE_TICKET_CREATED,
                                        message: {
                                            title: 'Service Ticket created',
                                            body: `${serviceTicket.ticketId} created via web`
                                        },
                                        metadata: serviceTicket._id
                                    })

                                    // Save the notification with Service Ticket as the metadata
                                    notificationEntry.save(async (err: any, notification: INotificationServiceTicket) => {
                                        if (err) {
                                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                        }

                                        await notification.populate('metadata').execPopulate();
                                        await sio.to(companyId && companyId.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);
                                    })
                                }
                            )

                        }
                        return res.json({'status': Status.Success, 'message': 'Service ticket created successfully.', invalidJobTypes})
                    })
            })

        } else {
            return res.json({'status': Status.Error, 'message': err.message})
        }
    });
}

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
        const dueDate = params.dueDate ? new Date(params.dueDate) : null;
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
        return next(error, null);
    };

    return next(null, serviceTicket);

}

export const getServiceTickets = (req: Request, res: Response) => {

    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    ServiceTicket.find({ company: companyId })
        .populate({
            path: 'customer',
            select: 'info.email profile.displayName contactName',
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
        .exec((err: any, serviceTickets: IServiceTicket[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'serviceTickets': serviceTickets})
        }
    )

}

export const getOpenServiceTickets = (req: Request, res: Response) => {

            const params = req.body
            const pageSize = +req.query.pagesize;
            const currentPage = +req.query.page;
            let contactName: any;
            let companyId = req.companyId;
            let serviceTickets : any = [];
            let totalCount : number = 0;
            let customerNames: any;

            if (req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId
            }

            if (params.customerNames) {
                customerNames = params.customerNames.split(',')
            }

            let criteria : any = {
                company: companyId,
                jobCreated: false
            };

            if (params.contactName) {
                contactName = params.contactName;
                criteria['customerContactId.name'] = contactName;
            }


            if (params.jobTypeTitle) {
                criteria['jobType.title'] = params.jobTypeTitle
            }

            if (params.dueDate) {
                criteria.$or = [{dueDate:null}, {dueDate: {"$gte": new Date(params.dueDate), "$lte": new Date(params.dueDate+ ' 23:59:00.000Z')}}]
            }

            if (params.ticketId) {
                let ticketId = params.ticketId;
                if (ticketId.match(/\d/g)) {
                    ticketId = 'Ticket '+ticketId.match(/\d/g).join("");
                }
                criteria.ticketId = { $regex: ticketId, $options: 'i'}
            }

            if(params.customerNames && params.customerNames.length >0) {
                criteria['customer.profile.displayName'] = { $in: customerNames }
            }

            const Query = ServiceTicket.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: "customer",
                        foreignField: "_id",
                        as: "customer"
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
                { "$match": criteria },
                {
                    $project: {
                      "_id": 1,
                      "customer": {$arrayElemAt:["$customer",0]},
                      "jobSite": {$arrayElemAt:["$jobSite",0]},
                      "jobLocation": {$arrayElemAt:["$jobLocation",0]},
                      "jobType": {$arrayElemAt:["$jobType",0]},
                      "company.info":{$arrayElemAt:["$companyInfo.info",0]},
                      "jobCreated" : 1,
                      "dueDate" : 1,
                      "note": 1,
                        "image": 1,
                        "customerPO": 1,
                        "customerContactId": 1,
                      "ticketId": 1,
                      "createdAt" : 1
                    }
                },
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
                    totalCount = documents[0].total
                }
                return res.json({'status': Status.Success, 'serviceTickets': serviceTickets , 'total': totalCount })
              }).catch((err:any) => {
                return res.json({'status': Status.Error, 'message': err.message})
            });
}


export const updateServiceTicket = (req: Request, res: Response) => {
    const user = <IUser>req.user
    updateFieldsAndUploadImageInS3(req, res, async (err: any, data)=>{
        if (!err) {
            const params = data.body;
            let customerContact = params.customerContactId ? params.customerContactId : null
            if (customerContact) {
                try {
                    customerContact = new ObjectId(customerContact);
                } catch (e) {
                    return res.json({'status': Status.Error, 'message': Messages.WrongId});
                }
            }
            let companyId = req.companyId;
            if(req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId
            }

            ServiceTicket.findOne(
                { _id: params.ticketId , company: companyId},
                async (err: any, serviceTicket: IServiceTicket)=>{

                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
                    if (!serviceTicket) {
                        return res.json({ status: Status.Error, message: `Service ticket not found or you are unauthorized to update this service ticket` });
                    }
                    let status = params.status ? params.status : serviceTicket.status;
                    let action = '';

                    let track: any[] = serviceTicket.track ? serviceTicket.track : [];
                    if(params.status) {
                        if (params.status == ServiceTicketStatus.ARCHIVED) {
                            action = '|Ticket archived|';
                        }
                        if (params.status == ServiceTicketStatus.REACTIVE) {
                            action = '|Ticket reactivated|';
                        }

                    }
                    if (serviceTicket.status == ServiceTicketStatus.ARCHIVED && status == ServiceTicketStatus.ARCHIVED) {
                        return res.json({'status': Status.Error, 'message': 'Ticket is archived'})
                    }

                    let dueDate: any = serviceTicket.dueDate
                    if(params.dueDate) {
                        dueDate = new Date(params.dueDate)
                    }
                    let image = data.imageUrl ? data.imageUrl : serviceTicket.image;

                    let customerPO = params.customerPO ? params.customerPO : serviceTicket.customerPO;

                    let customerContactId = customerContact ? customerContact : serviceTicket.customerContactId;

                    let customer = params.customerId ? new ObjectId(params.customerId) : serviceTicket.customer;

                    let jobLocationId: any = serviceTicket.jobLocation
                    if (params.jobLocationId) {
                        jobLocationId = params.jobLocationId
                    }


                    let jobSiteId: any = serviceTicket.jobSite
                    if (params.jobSiteId) {
                        jobSiteId = params.jobSiteId
                    }

                    let jobTypeId: any = serviceTicket.jobType
                    if (params.jobTypeId) {
                        jobTypeId = params.jobTypeId
                    }

                    //=== HANDLE params jobTypes
                    let currentJobTypes = serviceTicket.tasks;
                    let jobTypes: IJobTypes[], invalidJobTypes: string[];
                    let isJobTypesUpdated = false;
                    try {
                        // Call JobType's function to handle Job Types JSON params
                        ({ jobTypes, invalidJobTypes } = await _handleJobTypesJson(customer.toString(), params.jobTypes, currentJobTypes));
                    } catch (error) {
                        return res.json({ status: Status.Error, message: error.message });
                    }
                    // Check if jobTypes changed or not
                    if (JSON.stringify(currentJobTypes) !== JSON.stringify(jobTypes)) {
                        action += '|Updated JobTypes|';
                        isJobTypesUpdated = true;
                    }
                    //=== END HANDLE params jobTypes

                    if (
                        serviceTicket.dueDate != params.dueDate ||
                        serviceTicket.image != data.imageUrl ||
                        params.customerPO != serviceTicket.customerPO ||
                        serviceTicket.customerContactId != customerContactId ||
                        params.jobLocationId != serviceTicket.jobLocation ||
                        params.jobSiteId != serviceTicket.jobSite ||
                        params.jobTypeId || serviceTicket.jobType
                    ) {
                        action += '|Ticket info updated|'
                    }
                    if (action !== '') {
                        track.push({
                            user: user._id,
                            action,
                            date: new Date()
                        });
                    }
                    serviceTicket.updateOne(
                        {
                            note: params.note,
                            dueDate: dueDate,
                            jobLocation: jobLocationId,
                            jobSite: jobSiteId,
                            jobType: jobTypeId, // TODO: To be deprecated
                            tasks: jobTypes,
                            image: image,
                            customerPO: customerPO,
                            customerContactId: customerContactId,
                            customer: customer,
                            status: status,
                            track: track
                        },
                        async (err: any)=> {

                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }

                            // Update jobs related to this service ticket is jobTypes updated
                            if (isJobTypesUpdated) {
                                const jobs = await Job.find({ ticket: serviceTicket._id });
                                for (const job of jobs) {
                                    // Update job's track
                                    const jobTrack = job.track;
                                    jobTrack.push({
                                        user: user._id,
                                        action: '|Updated JobTypes|',
                                        date: new Date()
                                    })
                                    // Save the job
                                    await job.updateOne({
                                        jobTypes,
                                        track: jobTrack
                                    });
                                }
                            }

                            return res.json({'status': Status.Success, 'message': 'Ticket updated successfully.', invalidJobTypes})
                        }
                    )
                }
            )
        } else {
            return res.json({'status': Status.Error, 'message': err.message})
        }
    });
}

export const editServiceTicket = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    ServiceTicket.findOne(
        { _id: params.ticketId , company: companyId},
        (err: any, serviceTicket: IServiceTicket)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            let action = '';

            let track: any[] = serviceTicket.track ? serviceTicket.track : [];
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
                return res.json({'status': Status.Error, 'message': 'Invalid ticket status'})
            }

            serviceTicket.updateOne(
                {status: params.status, editedBy: user._id, editedAt: Date.now(), track: track },
                (err: any)=> {

                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }

                    return res.json({'status': Status.Success, 'message': 'Ticket status changed successfully.'})
                }
            )
        }
    )
}


export const getServiceTicketDetail = (req: Request, res: Response) => {

    const params = req.body

    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    ServiceTicket.findOne(
        { _id: params.ticketId , company: companyId})
        .populate({
            path: 'customer',
            select: 'info.email profile.displayName contactName'
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
            select: 'title'
        })
        .populate({
            path: 'tasks.jobType',
            select: 'title'
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
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'serviceTicket': serviceTicket})
        }
    )
}
