import {Request, Response} from 'express'
import { Status, Messages, ServiceTicketStatus } from '../common/constants'

import { ICompany } from '../models/Company'
import { ServiceTicket, IServiceTicket } from '../models/ServiceTicket'
import {IUser, User} from '../models/User'
import {parseFieldsAndUploadImageInS3, updateFieldsAndUploadImageInS3} from '../services/aws';
import {Customer} from '../models/Customer';
import { ObjectId } from 'mongodb'

export const createServiceTicket = (req: Request, res: Response) => {

    parseFieldsAndUploadImageInS3(req, res, async (err: any, data)=>{
        if (!err) {
            const params = data.body
            var companyId = req.companyId;
            var user = <IUser>req.user
            var company  = <ICompany>req.company;
            let customerContact = params.customerContactId ? params.customerContactId : null
            if (customerContact) {
                try {
                    customerContact = new ObjectId(customerContact);
                } catch (e) {
                    return res.json({'status': Status.Error, 'message': Messages.WrongId});
                }
            }
            let customerPo = params.customerPO ? params.customerPO : null;
            let customerId;
            try {
                customerId = new ObjectId(params.customerId)
            } catch (e) {
                return res.json({'status': Status.Error, 'message': Messages.WrongId});
            }

            if(req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId
            }
            var ticketId = 'Ticket '+ (company.currentJobId+1)
            if(company.prefix != undefined && company.prefix != null && company.prefix == '""') {
                ticketId = 'Ticket '+company.prefix+'-'+(company.currentJobId+1)
            }

            var dueDate = params.dueDate ? new Date(params.dueDate) : null
            let serviceTicket = new ServiceTicket({
                createdAt: Date.now(),
                dueDate: dueDate,
                customer: customerId,
                createdBy: user._id,
                company: companyId,
                note: params.note,
                technician: params.technicianId,
                ticketId: ticketId,
                jobLocation: params.jobLocationId,
                jobSite: params.jobSiteId,
                jobType: params.jobTypeId,
                customerPO : customerPo,
            })
            if (customerContact) {
                const customerWithContact = await Customer.findOne(
                        {
                            _id : customerId,
                            contacts: { $exists: true, $in: [customerContact] } }
                            );
                if (customerWithContact) {
                    serviceTicket.customerContactId = customerContact;
                }
            }
            serviceTicket.image = data.imageUrl ? data.imageUrl : null;
            await serviceTicket.save(async (err: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                await company.updateOne({currentJobId: company.currentJobId+1 })
                    .exec((err: any, raw: any)=>{
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }
                        return res.json({'status': Status.Success, 'message': 'Service ticket created successfully.'})
                    })
            })

        } else {
            return res.json({'status': Status.Error, 'message': err.message})
        }
    });
}


export const getServiceTickets = (req: Request, res: Response) => {

    var companyId = req.companyId;
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
            var companyId = req.companyId;
            var serviceTickets : any = [];
            var totalCount : number = 0;
            var customerNames: any;

            if (req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId
            }

            if (params.customerNames) {
                customerNames = params.customerNames.split(',')
            }

            var criteria : any = {
                company: companyId,
                jobCreated: false
            };

            if (params.contactName) {
                contactName = params.contactName;
                criteria['customer.contactName'] = contactName;
            }


            if (params.jobTypeTitle) {
                criteria['jobType.title'] = params.jobTypeTitle
            }

            if (params.dueDate) {
                criteria.$or = [{dueDate:null}, {dueDate: {"$gte": new Date(params.dueDate), "$lte": new Date(params.dueDate+ ' 23:59:00.000Z')}}]
            }

            if (params.ticketId) {
                var ticketId = params.ticketId;
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
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
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
            var companyId = req.companyId;
            if(req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId
            }

            ServiceTicket.findOne(
                { _id: params.ticketId , company: companyId},
                (err: any, serviceTicket: IServiceTicket)=>{

                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
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



                    let jobLocationId: any = serviceTicket.jobLocation
                    jobLocationId = params.jobLocationId


                    let jobSiteId: any = serviceTicket.jobSite
                    jobSiteId = params.jobSiteId

                    let jobTypeId: any = serviceTicket.jobType
                    jobTypeId = params.jobTypeId

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
                    track.push({
                        user: user._id,
                        action,
                        date: new Date()
                    });
                    serviceTicket.updateOne(
                        {
                            note: params.note,
                            dueDate: dueDate,
                            jobLocation: jobLocationId,
                            jobSite: jobSiteId,
                            jobType: jobTypeId,
                            image: image,
                            customerPO: customerPO,
                            customerContactId: customerContactId,
                            status: status,
                            track: track
                        },
                        (err: any, raw: any)=> {

                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }

                            return res.json({'status': Status.Success, 'message': 'Ticket updated successfully.'})
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

    var companyId = req.companyId;
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
                {status: params.status, editedBy: user._id, editedAt: Date.now() },
                (err: any, raw: any)=> {

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

    var companyId = req.companyId;
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
        .exec((err: any, serviceTicket: IServiceTicket)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'serviceTicket': serviceTicket})
        }
    )
}
