// src/controllers/advancePayment.controller.ts

import { Controller, Get, Post, Path, Body, Route, Tags, Query, Security, Response, Patch, Request, Put } from 'tsoa';
import { Request as RequestExpress, Response as ResponseExpress } from 'express';
import { AdvancePaymentService } from '../../services/v3/advancePayment';
import { ICreateAdvancePaymentInput, ICreateAdvancePaymentRequestBody, IUpdateAdvancePaymentInput, IVoidAdvancePaymentInput } from '../../types/v3/advancePayment';
import * as Sentry from '@sentry/node';


/**
 * @tags Advance Payment - For advance payments
 */
@Tags('Advance Payment')
@Route('advance-payment')

export class AdvancePaymentController extends Controller {
    /**
   * @summary To record an advance payment for vendor.
   */
    
    @Post()
    // @Security('jwt')
    public async createAdvancePaymentContractor( @Body() body: ICreateAdvancePaymentRequestBody
    ) : Promise<any> {
        try {
            const userId = 2; // TODO: req.user;
            const companyId = 2; // TODO: req.company;

            const advancePaymentService = new AdvancePaymentService();  
            return await advancePaymentService.createAdvancePayment( body, userId, companyId );
        } catch (err) {
            throw new Error(err.message);
        }
    }
      
    
    /**
   * @summary Get the advance payments history for particular vendor or employee
   */

    @Get()
    // @Security('jwt')
    public async getAdvancePaymentsByContractor(
        @Query('type') type?: 'vendor' | 'employee',
        @Query('isActive') isActive?: 'ALL' | 'active' | 'void',
        @Query('id') id?: number,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('offset') offset?: string,
            // @Request() req: Request
    ): Promise<any> {
        
        try {
            const advancePaymentService = new AdvancePaymentService(); 

            const companyId = 2; // TODO: req.company;
            const query:any = {};
            const paramObj = {
                type,
                isActive,
                id,
                startDate,
                endDate,
                offset,
                
            };

            return await advancePaymentService.getAdvancePayment(paramObj, query, companyId);
        } catch (err) {
            throw new Error(err.message);
        }
    }


    /**
   * @summary To update advance payment contractor record
   */

    @Put()
    // @Security('jwt')
    public async updateAdvancePaymentContractor(
        @Body() body: IUpdateAdvancePaymentInput, 
        @Request() req: Request
    ): Promise<any> {
        try {
            const userId = 2; // TODO: req.user;
            const companyId = 2; // TODO: req.company;

            const advancePaymentService = new AdvancePaymentService();  
            return await advancePaymentService.updateAdvancePayment( body, userId, companyId );
        } catch (err) {
            throw new Error(err.message);
        }
    }

    /**
   * @summary To void advance payment contractor
   */

    @Patch()
    // @Security('jwt')
    public async voidAdvancePaymentContractor(
        // @Path() advancePaymentId: number,
        @Body() body: IVoidAdvancePaymentInput, 
        @Request() req: Request
        
    ): Promise<any> {
        try {
            const userId = 2; // TODO: req.user;
            const companyId = 2; // TODO: req.company;\

            const advancePaymentService = new AdvancePaymentService();  
            return await advancePaymentService.voidAdvancePayment( body, userId, companyId );
        } catch (err) {
            throw new Error(err.message);
        }
    }

}