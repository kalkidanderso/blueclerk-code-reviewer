import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { ICompany } from '../models/Company'
import { ServiceTicket, IServiceTicket } from '../models/ServiceTicket'
import { IUser } from '../models/User'

export const createServiceTicket = (req: Request, res: Response) => {

    const params = req.body
    var companyId = req.companyId;
    var user = <IUser>req.user;

    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    console.log(companyId);

    const serviceTicket = new ServiceTicket({
        createdAt: Date.now(),
        scheduleTime: params.scheduleTime,
        customer: params.customerId,
        createdBy: user._id,
        company: companyId,
        comment: params.comment,
        note: params.note,
    })
    console.log(serviceTicket)
    serviceTicket.save((err: any) => {

        if (err) {
            console.log(err);
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Service ticket created successfully.'})

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
            select: 'info.name'
        })
        .populate({
            path: 'createdBy',
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
           
            serviceTicket.updateOne(
                {comment: params.comment, note: params.note, scheduleTime: params.scheduleTime},
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
            select: 'info.name'
        })
        .populate({
            path: 'createdBy',
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