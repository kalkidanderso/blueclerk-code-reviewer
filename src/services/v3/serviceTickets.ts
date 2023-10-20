import { PrismaClient } from "@prisma/client";
import {IServiceTicketInput, IServiceTicketDetail, ICreateServiceTicketInput, IUpdateServiceTicketInput, IUpdateStatusServiceTicketInput} from '../../types/v3/serviceTickets'
import { Status, Messages, ServiceTicketStatus } from '../../common/constants';
import { ServiceTickets } from '../../models/v3/serviceTicket';
import { EmailDefaultService } from './emailDefault'
import { UserService } from './user'
const prisma = new PrismaClient();

import moment from "moment"
export class ServiceTicketsService {
    constructor() {}

    async GetFilterServiceTickets({
        keyword,
        status,
        startDate,
        endDate,
        customerId,
        technicianIds,
        nextCursor,
        previousCursor,
        companyId,
        workType,
        companyLocation,
        isHomeOccupied,
        bouncedEmailFlag,
        currentPage,
        pageSize
    }:IServiceTicketInput, query: any, type: string, ): Promise<any> {
        const servicetickets = new ServiceTickets(prisma.servicetickets);
        if (nextCursor && previousCursor) {
            throw new Error('Provided cursor could only be one of either nextCursor or previousCursor.');
        }

        query = [];
        if (companyId) {
            query.push({
                OR: [
                    { companyId: companyId }
                ]
            })
        }

        if(isHomeOccupied) {
            query.push({isHomeOccupied:true})
        }

        if(bouncedEmailFlag) {
            query.push({bouncedEmailFlag:true})
        }
        let technicianIdsArr: any[] = technicianIds ? Array.isArray(technicianIds) ? technicianIds : [technicianIds] : [];

        if (technicianIdsArr?.length) {
            const technicians = technicianIdsArr.map((technicianId: number | string) => {
                if (typeof technicianId === 'number') {
                    return technicianId;
                } else if (typeof technicianId === 'string' && !isNaN(Number(technicianId))) {
                    return parseInt(technicianId, 10);
                }
            }).filter(tech => tech);
            query.push({ technicianId: { in: technicians } });
        }
        
        if (status === 0) {
            query.push({
                status: { not: 1 },
                jobCreated: false
            });
        }
        
        if (status === 1) {
            query.push({
                OR: [
                    { status: { not: 1 } },
                    { status: 1, jobCreated: true }
                ]
            });
        }

        if (startDate && endDate) {
            const startDateMoment = moment(startDate).format('YYYY-MM-DD');
            const endDateMoment = moment(endDate).format('YYYY-MM-DD');
            query.push({
                dueDate: {
                gte: new Date(startDateMoment),
                lte: new Date(endDateMoment)
                }
            });
        }
        
        if (customerId) {
            query.push({
                customer: {
                    id: customerId 
                }
            });
        }
        
        if (type === "Ticket") {
            query.push({
                type: {
                not: "PORequest"
                }
            });
        } else if (type === "PO Request") {
            query.push({
                type: "PORequest",
                status: {
                not: 1
                }
            });
        } else if (type === "All PO Request") {
            query.push({
                type: "PORequest"
            });
        }

        if (workType) {
            let workTypeIds: number[] = [];
            query.push({ workTypeId: { in: workTypeIds } });
        }
        
        if (companyLocation) {
            let companyLocationIds: any[] = [];
            query.push({ companyLocationId: { in : companyLocationIds }});
        }

        let ids: any[] = [];
        if(keyword){
            ids = await prisma.servicetickets.findMany({
                where: { 
                    OR: [
                        {
                            customer: {
                                profile: {
                                    path: ['displayName'],
                                    string_contains: keyword
                                }
                            }
                        },
                        {
                            jobLocation: {
                                name: { contains: keyword }
                            }
                        },
                        {
                            technicianUser: {
                                profile: {
                                    path: ['displayName'],
                                    string_contains: keyword
                                }
                            }
                        },
                        {
                            jobSite: {
                                name: { contains: keyword }
                            }
                        },
                        {
                            company: {
                                info: {
                                    companyName: { contains: keyword }
                                }
                            }
                        },
                        {
                            homeOwner:{
                                profile: {
                                    path: ['displayName'],
                                    string_contains: keyword
                                }
                            }
                        }
                    ]
                },
                select: { id: true, customerId: true, jobLocationId: true, technicianId: true, jobSiteId: true, homeOwnerId:true, companyId:true }
            })
        }
        const result = ids.reduce((acc, item) => {
            for (const key in item) {
                if (key !== 'id') {
                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    if (!acc[key].includes(item[key])) {
                        acc[key].push(item[key]);
                    }
                }
            }
            return acc;
        }, {});
        
        if (!result.customerId) result.customerId = [];
        if (!result.jobLocationId) result.jobLocationId = [];
        if (!result.technicianId) result.technicianId = [];
        if (!result.jobSiteId) result.jobSiteId = [];
        if (!result.companyId) result.companyId = [];
        if (!result.homeOwnerId) result.homeOwnerId = [];

        const queryFilter = [];
        if (result?.customerId?.length > 0) {
            queryFilter.push({ "customerId": { in: result?.customerId } });
        }
        if (result?.jobLocationId?.length > 0) {
            queryFilter.push({ "jobLocationId": { in: result?.jobLocationId } });
        }
        if (result?.technicianId?.length > 0) {
            queryFilter.push({ "technicianId": { in: result?.technicianId } })
        }
        if (result?.jobSiteId?.length > 0) {
            queryFilter.push({ "jobSiteId": { in: result?.jobSiteId } });
        }
        if (result?.companyId?.length > 0) {
            queryFilter.push({ "companyId": { in: result?.companyId } });
        }
        if (result?.homeOwnerId?.length > 0) {
            queryFilter.push({ "homeOwnerId": { in: result?.homeOwnerId } });
        }
        if (queryFilter.length > 0) {
            query.push({ OR: queryFilter });
        }
        
        const tickets = await servicetickets.findMany(query, currentPage, pageSize)
        return {
            status: Status.Success,
            data: tickets,
            total: tickets.length,
        } 
    }

    async GetDetailTicketByQuery(query:any): Promise<any> {
        const servicetickets = new ServiceTickets(prisma.servicetickets);
        const ticket = await servicetickets.findDetailUnique(query)
        if(!ticket) throw new Error('Data Not Found')
        return {status:Status.Success, data: ticket}
    }

    async CreateServiceTicket(body:ICreateServiceTicketInput, userId:number): Promise<any> {
        const servicetickets = new ServiceTickets(prisma.servicetickets);
        body.userId = userId;
        if(!body.type) body.type = "Ticket"
        let track:any = "[]";
        track = await this.CheckServiceTicketStatus(track, body.status, null)

        const ticket = await servicetickets.create(body, track)
        
        return {status:Status.Success, data:ticket}
    }

    async UpdateServiceTicket(body:IUpdateServiceTicketInput, query:any, userId:number): Promise<any> {
        const servicetickets = new ServiceTickets(prisma.servicetickets);
        body.userId = userId;
        if(!body.type) body.type = "Ticket"
        
        const serviceTicket = await servicetickets.findUniqueIdStatus(query);
        if (!serviceTicket) throw new Error('Data Not Found')

        let track:any = serviceTicket?.track || [];
        track = await this.CheckServiceTicketStatus(track, body.status, serviceTicket)

        const updateServiceTicket = await servicetickets.updateById(body, track, query)
        return {status:Status.Success, data:updateServiceTicket}
    }

    async UpdateStatusServiceTicket(body:IUpdateStatusServiceTicketInput, query:any, userId:number): Promise<any> {
        const servicetickets = new ServiceTickets(prisma.servicetickets);

        const serviceTicket = await servicetickets.findUniqueIdStatus(query);
        if (!serviceTicket) throw new Error('Data Not Found')
        let track:any = serviceTicket?.track || [];
        track = await this.CheckServiceTicketStatus(track, body.status, serviceTicket)
        const updateStatusServiceTicket = await servicetickets.updateStatusById(query, body, track, userId)
        return {status:Status.Success, data:updateStatusServiceTicket}
    }

    async DeleteServiceTicketById(id:number): Promise<any> {
        const servicetickets = new ServiceTickets(prisma.servicetickets);
        const deleteServiceTicket = await servicetickets.deleteById(id)
        return deleteServiceTicket;
    }

    async FilterIdAndCompanyOptional({
        id,
        companyId
    }:IServiceTicketDetail, query: any): Promise<any> {
        query = {
            id,
            ...(companyId !== undefined && { companyId })
        };
        return query;
    }

    async CheckServiceTicketStatus(track: any, bodyStatus:number, serviceTicket:any|null): Promise<any> {
        const jsonArray = JSON.parse(track);
        let action = '';
        if(bodyStatus || bodyStatus == 0) {
            if (bodyStatus == ServiceTicketStatus.ARCHIVED) {
                action = 'archived the ticket';
            }
            if (bodyStatus == ServiceTicketStatus.REACTIVE) {
                action = 'reactivated the ticket';
            }
            if (bodyStatus === ServiceTicketStatus.ACTIVE && bodyStatus != serviceTicket?.status) {
                action = 'reactivated the ticket';
            }
        }
        
        jsonArray.push({
            action,
            date: new Date()
        });

        if(bodyStatus != ServiceTicketStatus.ARCHIVED && bodyStatus != ServiceTicketStatus.ACTIVE && bodyStatus != ServiceTicketStatus.REACTIVE ) {
            throw new Error('Invalid ticket status')
        }
        return jsonArray;
    }

    async GetPoRequestEmailTemplate(id:number, userId:number): Promise<any> {
        const servicetickets = new ServiceTickets(prisma.servicetickets);
        const emailType = "PO_REQUEST"
        const ticket = await servicetickets.findDetailUniqueId(id)
        if (!ticket) throw new Error('Data Not Found')
        const emailDefaultService = new EmailDefaultService();
        const userService = new UserService();
        let emailDefault = await emailDefaultService.GetEmailDefaultByEmailTypeAndCompany(ticket.companyId, emailType)

        const DefaultPORequestEmailTemplate = {
            subject: `${ticket.type} from ${ticket.company.info.companyName}`,
            message: `Dear ${ticket.customer.contactName}, \n\nPlease see the attached ${ticket.id} for the work requested at. \nWe are not able to schedule the work until the po is received. Pricing subject to change due to items being added at the job site and/or item being heavily damaged. \n\nWe look forward to hearing from you at ${ticket.company.info.companyName}\n${ticket.company.info.logoUrl}`
        }

        if (!emailDefault) {
            emailDefault = await emailDefaultService.createEmailDefaultPORequest(ticket.companyId, emailType, DefaultPORequestEmailTemplate, userId, `${parseInt(ticket.alternativeId, 10)}`);
        }else {
            emailDefault = await emailDefaultService.updateEmailDefaultPORequest(DefaultPORequestEmailTemplate, userId, emailDefault.id);
        }

        const user = await userService.getDetailUser(userId)

        const emailList = [
            {
                name: user.profile?.displayName,
                email: user.auth?.email
            }
        ];
    
        if (ticket.companyLocation?.poRequestEmailSender) {
            emailList.unshift(
                {
                    name: "Default Email From",
                    email: ticket.companyLocation?.poRequestEmailSender
                }
            )
        }
        return {
            status: Status.Success,
            emailTemplate: {
                from: emailList[0],
                emailList: emailList,
                to: ticket?.customer?.contacts[0]?.email,
                subject: eval('`' + emailDefault.subject + '`'),
                message: eval('`' + emailDefault.message + '`')
            }
        }

    }
}