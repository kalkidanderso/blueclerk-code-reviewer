import { Controller, Route, Get, Post, Put, Delete, Body, Query, Path, Response } from 'tsoa';
import JobReportServices from '../../services/v3/jobReports';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const jobReportServices = new JobReportServices(prisma);

@Route('job-reports')
export class JobReportsController extends Controller {

    @Post()
    public async create(@Body() requestBody: any): Promise<any> {
        try {
            return await jobReportServices.createJobReport(requestBody.jobId, requestBody.companyId, requestBody.customerName, requestBody.technicianName, new Date(requestBody.date), requestBody.contractorId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Get()
    public async getAll(@Query() query: any): Promise<any> {
        try {
            return await jobReportServices.getAllJobReports(query);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Get('{jobReportId}')
    public async getDetails(@Path() jobReportId: string): Promise<any> {
        try {
            return await jobReportServices.getJobReportDetails(jobReportId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Delete('{jobReportId}')
    @Response(404, 'Job Report not found')
    public async delete(@Path() jobReportId: string): Promise<any> {
        try {
            return await jobReportServices.deleteJobReportById(jobReportId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Post('send')
    public async sendReport(@Body() requestBody: any): Promise<any> {
        try {
            return await jobReportServices.sendJobReport(requestBody);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Get('email-template/{jobReportId}')
    public async getEmailTemplate(@Path() jobReportId: string): Promise<any> {
        try {
            return await jobReportServices.getJobReportEmailTemplate(jobReportId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }
}
