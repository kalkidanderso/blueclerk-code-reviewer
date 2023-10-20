// src/controllers/serviceticketsController.ts

import { Controller, Get, Post, Put, Delete, Path, Body, Route, Tags, Query, Security, Response, Patch } from 'tsoa';
import { Status, DefaultPageSize } from '../../common/constants';
import {IUpdateStatusServiceTicketInput, ICreateServiceTicketInput, IUpdateServiceTicketInput} from '../../types/v3/serviceTickets'
import {ServiceTicketsService} from '../../services/v3/serviceTickets'
import * as Sentry from '@sentry/node';


/**
 * @tags Service Tickets - For creating and getting service tickets
 */
@Tags("Service Tickets")
@Route('service-tickets')
export class GetServiceTicketsController extends Controller {
    /**
   * @summary To get all service tickets of a company or company of employee.
   */
    @Get()
    // @Security('jwt')
    public async getServiceTickets(
        @Query('type') type: "Ticket" | "PO Request" | "All PO Request",  
        @Query('keyword') keyword?: string,
        @Query('status') status?: number,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('customerId') customerId?: number,
        @Query('technicianIds') technicianIds?: number[],
        @Query('nextCursor') nextCursor?: string,
        @Query('previousCursor') previousCursor?: string,
        @Query('currentPage') currentPage: number = 0,
        @Query('pageSize') pageSize: number = DefaultPageSize,
        @Query('companyId') companyId?: number,
        @Query('workType') workType?: any,
        @Query('companyLocation') companyLocation?: any,
        @Query('isHomeOccupied') isHomeOccupied?:boolean,
        @Query('bouncedEmailFlag') bouncedEmailFlag?:boolean ) : Promise<any> {
        
        const ServiceTicket = new ServiceTicketsService();
        try {
            let query:any = []
            const paramObj = {
                keyword,
                status,
                startDate,
                endDate,
                customerId,
                technicianIds,
                nextCursor,
                previousCursor,
                currentPage,
                pageSize,
                companyId,
                workType,
                companyLocation,
                isHomeOccupied,
                bouncedEmailFlag
            }
            return await ServiceTicket.GetFilterServiceTickets(paramObj, query, type);
        } catch (err) {
            throw new Error(err.message);
        }
    }

    /**
   * @summary Get Serviceticket by ID
   * @param id ID of the Serviceticket
   */
    @Get('{id}')
    @Response(404, "Service Ticket Not Found")
    public async getServiceTicketDetail(@Path() id: number,  @Query() companyId?: number): Promise<any | null> {
        const ServiceTicket = new ServiceTicketsService();
        try {
            let query:any = {}
            query = await ServiceTicket.FilterIdAndCompanyOptional({id, companyId}, query)
            
            return await ServiceTicket.GetDetailTicketByQuery(query)
        } catch (err) {
            throw new Error(err.message)
        }
    }

    /**
   * @summary Create Serviceticket
   */
    @Post()
    public async createServiceTicket(@Body() body:ICreateServiceTicketInput): Promise<any> {
        try {
            const ServiceTicket = new ServiceTicketsService();
            const userId = 2; // TODO: <IUser>req.user;
            
            return await ServiceTicket.CreateServiceTicket(body, userId)
        } catch (err) {
            throw new Error(err.message)
        }
    }

    /**
   * @summary Update Serviceticket
   */
    @Put('{id}')
    @Response(404, "Data Not Found")
    public async updateServiceTicket(@Path() id: number, @Body() body:IUpdateServiceTicketInput, @Query() companyId?: number): Promise<any> {
        try {
            const ServiceTicket = new ServiceTicketsService();
            const userId = 2; // TODO: <IUser>req.user;
            let query:any = {}
            query = await ServiceTicket.FilterIdAndCompanyOptional({id, companyId}, query)

            return await ServiceTicket.UpdateServiceTicket(body, query, userId)
        } catch (err) {
            throw new Error(err.message)
        }
    }

    /**
   * @summary Edit Status Serviceticket by ID
   * @param id ID of the Serviceticket
   */
    @Patch('{id}')
    @Response(404, "Data Not Found")
    public async editStatusServiceTicket(@Path() id: number, @Body() body: IUpdateStatusServiceTicketInput, @Query() companyId?: number): Promise<any> {
        try {
            const ServiceTicket = new ServiceTicketsService();
            const userId = 2; // TODO: <IUser>req.user;
            let query:any = {}
            query = await ServiceTicket.FilterIdAndCompanyOptional({id, companyId}, query)
            
            return await ServiceTicket.UpdateStatusServiceTicket(body, query, userId)
        } catch (err) {
            throw new Error(err.message)
        }
    }

    /**
     * @summary Delete Serviceticket by ID
     * @param id ID of the Serviceticket
     */
    @Delete('{id}')
    @Response(404, "Data Not Found")
    public async deleteServiceTicket(@Path() id: number): Promise<any> {
        try {
            const ServiceTicket = new ServiceTicketsService();
            await ServiceTicket.DeleteServiceTicketById(id)
            
            this.setStatus(200)
            return {status: Status.Success, message: 'Delete service ticket successfully.' }
        } catch (err){
            throw new Error(err.message)
        }
    }

    /**
     * @summary Get Service Ticket Email Template Before Send Email
     * @param id ID of the Serviceticket
     */
    @Get('/po-request-email-template/{id}')
    @Response(404, "Data Not Found")
    public async getPORequestEmailTemplate(@Path() id: number): Promise<any> {
        try {
            const ServiceTicket = new ServiceTicketsService();
            const userId = 2; // TODO: <IUser>req.user;
            return await ServiceTicket.GetPoRequestEmailTemplate(id, userId)
        } catch (err){
            throw new Error(err.message)
        }
    }
}