import { Servicetickets, Prisma, PrismaClient } from "@prisma/client";
import { ICreateServiceTicketInput, IServiceTickets, IUpdateServiceTicketInput, IUpdateStatusServiceTicketInput } from "../../types/v3/serviceTickets"
import { Status } from '../../common/constants';

export class ServiceTickets {
    constructor(private readonly prisma: PrismaClient['servicetickets']) {}
    async findMany(query:any, currentPage:number, pageSize:number) : Promise<any> {
        try {
            return await this.prisma.findMany({
                where: {
                    AND: query
                },
                select: {
                    id: true,
                    company: {
                        select: { id:true, info: { select: { id:true, companyName: true } } }
                    },
                    createdAt:true,
                    createdByUser: {
                        select: {  id:true, profile: true, permissions:true }
                    },
                    customer:{
                        select:{ id:true, info:true, profile:true }
                    },
                    editedByUser: {
                        select: {  id:true, profile: true, permissions:true }
                    },
                    technicianUser:{
                        select: {  id:true, profile: true, permissions:true }
                    },
                    homeOwner:{
                        select: {  id:true, info:true, profile:true, address:true, contact:true }
                    },
                    pooverriddenById:true,
                    customerContactId:true,
                    customerPO:true,
                    dueDate:true,
                    image:true,
                    jobCreated:true,
                    jobLocation:true,
                    jobSite: true,
                    jobType:true,
                    note:true,
                    status:true,
                    source:true,
                    ticketId:true,
                    track:true,
                },
                skip: currentPage * pageSize,
                take: pageSize,
            });
        } catch (err) {
            throw new Error( err.message )
        }
    }
    
    async create({
        alternativeId,
        userId,
        dueDate,
        customerId,
        note,
        customerContactId,
        customerPO,
        image,
        images,
        companyId,
        technicianId,
        status,
        ticketId,
        jobLocationId,
        jobSiteId,
        isHomeOccupied,
        homeOwnerId,
        homeJobLocationId,
        homeJobSiteId,
        jobTypeId,
        itemId,
        jobCreated,
        source,
        workTypeId,
        companyLocationId,
        pooverriddenById,
        type,
        emailHistory,
        bouncedEmailFlag,
    } : ICreateServiceTicketInput, track:any) : Promise<any> {
        try {
            return await this.prisma.create({ 
                data: {
                    alternativeId,
                    createdAt:new Date(),
                    dueDate:new Date(dueDate),
                    customerId,
                    createdById:userId,
                    note:note,
                    customerContactId:customerContactId,
                    customerPO:customerPO,
                    image:image,
                    images:images,
                    companyId:companyId,
                    technicianId:technicianId,
                    status:status,
                    editedById:userId,
                    editedAt:new Date(),
                    ticketId:ticketId,
                    jobLocationId:jobLocationId,
                    jobSiteId:jobSiteId,
                    isHomeOccupied:isHomeOccupied,
                    homeOwnerId:homeOwnerId,
                    homeJobLocationId:homeJobLocationId,
                    homeJobSiteId:homeJobSiteId,
                    jobTypeId:jobTypeId,
                    itemId:itemId,
                    jobCreated:jobCreated,
                    source:source,
                    workTypeId:workTypeId,
                    companyLocationId:companyLocationId,
                    pooverriddenById:pooverriddenById,
                    type:type,
                    emailHistory:emailHistory,
                    lastEmailSent:new Date(),
                    track:JSON.stringify(track),
                    bouncedEmailFlag:bouncedEmailFlag,
                } 
            });
        } catch (err) {
            if (err.code === 'P2003') {
                const fieldName = err.meta.field_name;
                switch (fieldName) {
                    case 'Servicetickets_customerContactId_fkey (index)':
                        throw new Error('Customer contact not found.')    
                    case 'Servicetickets_technicianId_fkey (index)':
                        throw new Error('Technician not found.')  
                    case 'Servicetickets_customerId_fkey (index)':
                        throw new Error('Customer not found.')  
                    case 'Servicetickets_companyId_fkey (index)':
                        throw new Error('Company not found.')  
                    case 'Servicetickets_jobLocationId_fkey (index)':
                        throw new Error('Job Location not found.')  
                    case 'Servicetickets_jobSiteId_fkey (index)':
                        throw new Error('Job Site not found.')  
                    case 'Servicetickets_homeOwnerId_fkey (index)':
                        throw new Error('Home Owner not found.')  
                    case 'Servicetickets_homeJobLocationId_fkey (index)':
                        throw new Error('Home Job Location not found.')  
                    case 'Servicetickets_homeJobSiteId_fkey (index)':
                        throw new Error('Home Job Site not found.')  
                    case 'Servicetickets_jobTypeId_fkey (index)':
                        throw new Error('Job Type not found.')  
                    case 'Servicetickets_itemId_fkey (index)':
                        throw new Error('Item not found.')  
                    case 'Servicetickets_workTypeId_fkey (index)':
                        throw new Error('Work Type not found.')  
                    case 'Servicetickets_companyLocationId_fkey (index)':
                        throw new Error('Company Location not found.')  
                    default:
                        throw new Error(`Foreign key constraint failed: ${fieldName}`)
                }
            } else {
                throw new Error( err.message )
            }
        }
    }

    async findDetailUnique(query:any): Promise<any>{
        return await this.prisma.findUnique({
            where: query,
            include: {
                customer: true,
                homeOwner: true,
                technicianUser: true,
                jobLocation: true,
                jobSite: true,
                jobType: true,
                tasks: true,
                customerContact: true,
            },
        });
    }

    async findUniqueIdStatus(query:any): Promise<any>{
        try {
            return await this.prisma.findUnique({
                where: query,
                select:{
                    id:true,
                    status:true,
                    track: true
                }
            });
        } catch (err) {
            throw new Error( err.message ) 
        }
    }

    async findDetailUniqueId(id:number): Promise<any>{
        try {
            return await this.prisma.findUnique({
                where: {id},
                include: {
                    company:{
                        select:{id:true, info:true}
                    },
                    customer:{
                        select: {
                            id:true,
                            contactName:true,
                            contacts:true
                        }
                    },
                    companyLocation:true
                }
            });
        } catch (err) {
            throw new Error( err.message ) 
        }
    }

    async updateStatusById(query:any, body:IUpdateStatusServiceTicketInput, track:any, userId:number): Promise<any>{
        try {
            return await this.prisma.update(
                {
                    where: query,
                    data: {status: body.status, editedById: userId, editedAt: new Date(), track: JSON.stringify(track) },
                }
            )
        } catch (err) {
            throw new Error( err.message ) 
        }
    }
    
    async updateById({
        alternativeId,
        userId,
        dueDate,
        customerId,
        note,
        customerContactId,
        customerPO,
        image,
        images,
        companyId,
        technicianId,
        status,
        ticketId,
        jobLocationId,
        jobSiteId,
        isHomeOccupied,
        homeOwnerId,
        homeJobLocationId,
        homeJobSiteId,
        jobTypeId,
        itemId,
        jobCreated,
        source,
        workTypeId,
        companyLocationId,
        pooverriddenById,
        type,
        emailHistory,
        bouncedEmailFlag,
    }:IUpdateServiceTicketInput, track:any, query:any): Promise<any>{
        try {
            return await this.prisma.update({ 
                where:query,
                data: {
                    alternativeId:alternativeId,
                    dueDate:new Date(dueDate),
                    customerId:customerId,
                    note:note,
                    customerContactId:customerContactId,
                    customerPO:customerPO,
                    image:image,
                    images:images,
                    companyId:companyId,
                    technicianId:technicianId,
                    status:status,
                    editedById:userId,
                    editedAt:new Date(),
                    ticketId:ticketId,
                    jobLocationId:jobLocationId,
                    jobSiteId:jobSiteId,
                    isHomeOccupied:isHomeOccupied,
                    homeOwnerId:homeOwnerId,
                    homeJobLocationId:homeJobLocationId,
                    homeJobSiteId:homeJobSiteId,
                    jobTypeId:jobTypeId,
                    itemId:itemId,
                    jobCreated:jobCreated,
                    source:source,
                    workTypeId:workTypeId,
                    companyLocationId:companyLocationId,
                    pooverriddenById:pooverriddenById,
                    type:type,
                    emailHistory:emailHistory,
                    track:JSON.stringify(track),
                    bouncedEmailFlag:bouncedEmailFlag,
                } 
            });
        } catch (err) {
            if (err.code === 'P2003') {
                const fieldName = err.meta.field_name;
                switch (fieldName) {
                    case 'Servicetickets_customerContactId_fkey (index)':
                        throw new Error('Customer contact not found.')    
                    case 'Servicetickets_technicianId_fkey (index)':
                        throw new Error('Technician not found.')  
                    case 'Servicetickets_customerId_fkey (index)':
                        throw new Error('Customer not found.')  
                    case 'Servicetickets_companyId_fkey (index)':
                        throw new Error('Company not found.')  
                    case 'Servicetickets_jobLocationId_fkey (index)':
                        throw new Error('Job Location not found.')  
                    case 'Servicetickets_jobSiteId_fkey (index)':
                        throw new Error('Job Site not found.')  
                    case 'Servicetickets_homeOwnerId_fkey (index)':
                        throw new Error('Home Owner not found.')  
                    case 'Servicetickets_homeJobLocationId_fkey (index)':
                        throw new Error('Home Job Location not found.')  
                    case 'Servicetickets_homeJobSiteId_fkey (index)':
                        throw new Error('Home Job Site not found.')  
                    case 'Servicetickets_jobTypeId_fkey (index)':
                        throw new Error('Job Type not found.')  
                    case 'Servicetickets_itemId_fkey (index)':
                        throw new Error('Item not found.')  
                    case 'Servicetickets_workTypeId_fkey (index)':
                        throw new Error('Work Type not found.')  
                    case 'Servicetickets_companyLocationId_fkey (index)':
                        throw new Error('Company Location not found.')  
                    default:
                        throw new Error(`Foreign key constraint failed: ${fieldName}`)
                }
            } else {
                throw new Error( err.message )
            }
        }
    }

    async deleteById(id:number): Promise<any>{
        try {
            return await this.prisma.delete({
                where: { id }
            });
        } catch (err) {
            throw new Error( err.message )
        }
    }
}