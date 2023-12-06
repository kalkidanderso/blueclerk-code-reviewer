import { Controller, Route, Get, Post, Put, Delete, Body, Query, Path, Response } from 'tsoa';
import { Request, Response as ExpressResponse } from 'express';
import {
    createJobReport,
    getAllJobReports,
    getJobReportDetails,
    deleteJobReportById,
    sendJobReport,
    getJobReportEmailTemplate
} from '../../services/v3/jobReports';

@Route('job-reports')
export class JobReportsController extends Controller {

    @Post()
    public async create(@Body() requestBody: any): Promise<any> {
        try {
            return await createJobReport(requestBody.jobId, requestBody.companyId, requestBody.customerName, requestBody.technicianName, new Date(requestBody.date), requestBody.contractorId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Get()
    public async getAll(@Query() query: any): Promise<any> {
        try {
            return await getAllJobReports(query);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Get('{jobReportId}')
    public async getDetails(@Path() jobReportId: string): Promise<any> {
        try {
            return await getJobReportDetails(jobReportId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Delete('{jobReportId}')
    @Response(404, 'Job Report not found')
    public async delete(@Path() jobReportId: string): Promise<any> {
        try {
            return await deleteJobReportById(jobReportId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Post('send')
    public async sendReport(@Body() requestBody: any): Promise<any> {
        try {
            return await sendJobReport(requestBody);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Get('email-template/{jobReportId}')
    public async getEmailTemplate(@Path() jobReportId: string): Promise<any> {
        try {
            return await getJobReportEmailTemplate(jobReportId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }
}
