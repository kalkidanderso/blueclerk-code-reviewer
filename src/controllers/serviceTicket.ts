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

    var scheduleDate = params.scheduleDate ? new Date(params.scheduleDate) : null

    const serviceTicket = new ServiceTicket({
        createdAt: Date.now(),
        scheduleDate: scheduleDate,
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
            let scheduleDate: any = serviceTicket.scheduleDate
            if(params.scheduleDate) {
                scheduleDate = new Date(params.scheduleDate)
            }

            let jobLocationId: any = serviceTicket.jobLocation
                jobLocationId = params.jobLocationId
 

            let jobSiteId: any = serviceTicket.jobSite
                jobSiteId = params.jobSiteId

            let jobTypeId: any = serviceTicket.jobType
                jobTypeId = params.jobTypeId
            
            serviceTicket.updateOne(
                {note: params.note, scheduleDate: scheduleDate, jobLocation: jobLocationId, jobSite: jobSiteId, jobType: jobTypeId},
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