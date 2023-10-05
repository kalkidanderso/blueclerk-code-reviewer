// src/controllers/advancePayment.controller.ts

import { Controller, Get, Post, Put, Delete, Path, Body, Route, Tags, Query, Security, Response, SuccessResponse, Patch, Request } from 'tsoa';
import { PrismaClient } from '@prisma/client';
import { Request as RequestExpress } from "express";
import { AdvancePaymentService } from '../../../services/v3/advancePayment.services';
import { IAdvancePayment, ICreateAdvancePaymentInput } from 'src/types/v3/advancePayment';
import * as Sentry from '@sentry/node';


@Tags("Advance Payment")
@Route('advance-payment')

export class AdvancePaymentController extends Controller {
    /**
   * @summary To get all advance payment of a company or company of employee.
   */
    @Post()
    // @Security('jwt')
    public async createAdvancePayment(
        // @Request() req: RequestExpress,
        @Body() params: ICreateAdvancePaymentInput,
    ) : Promise<IAdvancePayment> {
        
        try {
            const advancePaymentService = new AdvancePaymentService();  

            return await advancePaymentService.createAdvancePayment( params );
        } catch (err) {
            Sentry.captureException(err);
            throw err
        }
    }}