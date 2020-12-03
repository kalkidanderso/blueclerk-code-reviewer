import {Request, Response} from 'express'
import { Status, Messages, ServiceTicketStatus } from '../common/constants'

import { ICompany } from '../models/Company'
import { ServiceTicket, IServiceTicket } from '../models/ServiceTicket'
import { IUser } from '../models/User'

export const createServiceTicket = (req: Request, res: Response) => {

    const params = req.body
    var companyId = req.companyId;
    var user = <IUser>req.user
    var company  = <ICompany>req.company;

    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    var ticketId = 'Ticket '+ (company.currentJobId+1)
    if(company.prefix != undefined && company.prefix != null && company.prefix == '""') {
        ticketId = 'Ticket '+company.prefix+'-'+(company.currentJobId+1)
    }

    var dueDate = params.dueDate ? new Date(params.dueDate) : null

    const serviceTicket = new ServiceTicket({
        createdAt: Date.now(),
        dueDate: dueDate,
        customer: params.customerId,
        createdBy: user._id,
        company: companyId,
        note: params.note,
        technician: params.technicianId,
        ticketId: ticketId,
        jobLocation: params.jobLocationId,
        jobSite: params.jobSiteId,
        jobType: params.jobTypeId,
    })

    serviceTicket.save((err: any) => {
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        company.updateOne({currentJobId: company.currentJobId+1 })
        .exec((err: any, raw: any)=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            return res.json({'status': Status.Success, 'message': 'Service ticket created successfully.'})
        })
    })
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
            const match : any = {};
            const pageSize = +req.query.pagesize;
            const currentPage = +req.query.page;
            var companyId = req.companyId;
            var serviceTickets : any;
            var totalCount : number;

            if(req.otherCompanyId != undefined) {
                companyId = req.otherCompanyId
            }
            var criteria : any = {
                company: companyId,
                jobCreated: false
            };
            if (params.jobTypeTitle) {
                match.title = params.jobTypeTitle
            }

            if (params.dueDate) {
                criteria.dueDate = {"$gte": new Date(params.dueDate), "$lt": new Date(params.dueDate+ ' 23:59:00.000Z')}
            }

            if (params.ticketId) {
                var ticketId = params.ticketId;
                if (ticketId.match(/\d/g)) { 
                    ticketId = 'Ticket '+ticketId.match(/\d/g).join("");
                }
                criteria.ticketId = { $regex: ticketId, $options: 'i'}
            }
            
            var projection = { };
            var option = {
                lean: true, 
                sort: {createdAt : -1}
            };
            const Query = ServiceTicket.find(criteria, projection, option);
            if (pageSize && currentPage) {
                Query.skip(pageSize * (currentPage - 1)).limit(pageSize);
            }
            Query.populate({
                path: 'customer',
                select: 'info.email profile.displayName contactName',
                match: { 'profile.displayName': { $in: params.customerNames } },
            })
            .populate({
                path: 'jobSite',
                select: 'name location address',
            })
            .populate({
                path: 'jobLocation',
                select: 'name location address',
            })
            .populate({
                path: 'jobType',
                select: 'title isActive',
                match
            })
            .then((documents:IServiceTicket[]) => {
                serviceTickets = documents;
                return ServiceTicket.countDocuments(criteria);
              }).then((count :number) => {
                totalCount = count;
                return res.json({'status': Status.Success, 'serviceTickets': serviceTickets , 'total': totalCount })    
              }).catch((err:any) => {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            });
}


export const updateServiceTicket = (req: Request, res: Response) => {

    const params = req.body

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
           
            if (serviceTicket.status == ServiceTicketStatus.CANCELED) {
                return res.json({'status': Status.Error, 'message': 'Ticket is canceled'})
            }
            let dueDate: any = serviceTicket.dueDate
            if(params.dueDate) {
                dueDate = new Date(params.dueDate)
            }

            let jobLocationId: any = serviceTicket.jobLocation
                jobLocationId = params.jobLocationId
 

            let jobSiteId: any = serviceTicket.jobSite
                jobSiteId = params.jobSiteId

            let jobTypeId: any = serviceTicket.jobType
                jobTypeId = params.jobTypeId
            
            serviceTicket.updateOne(
                {note: params.note, dueDate: dueDate, jobLocation: jobLocationId, jobSite: jobSiteId, jobType: jobTypeId},
                (err: any, raw: any)=> {
                    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
    
                    return res.json({'status': Status.Success, 'message': 'Ticket updated successfully.'})
                }
            )
        }
    )
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
            
            if(params.status != ServiceTicketStatus.CANCELED && params.status != ServiceTicketStatus.ACTIVE && params.status != ServiceTicketStatus.REACTIVE ) {
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