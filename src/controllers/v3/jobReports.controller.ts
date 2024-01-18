import { Controller, Route, Get, Post, Delete, Body, Query, Path, Response, Request } from 'tsoa';
import JobReportServices from '../../services/v3/jobReports';
import { PrismaClient } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
const prisma = new PrismaClient();
const jobReportServices = new JobReportServices(prisma);

@Route('job-reports')
export class JobReportsController extends Controller {

    @Get()
    public async getAll(
        @Query() keyword?: string,
        @Query() startDate?: string,
        @Query() endDate?: string,
        @Query() currentPage?: number,
        @Query() pageSize?: number, 
        @Request() req?: ExpressRequest
    ): Promise<any> {
        try {
            const id = 2; // TODO req.v3.userSession.companyId
            const formatedStartDate = startDate ? new Date(startDate) : undefined;
            const formatedEndDate = endDate ? new Date(endDate) : undefined;

            return await jobReportServices.getAllJobReports(id, {
                keyword,
                startDate: formatedStartDate,
                endDate: formatedEndDate,
                currentPage,
                pageSize
            });
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Get('{jobReportId}')
    public async getDetails(@Path() jobReportId: number): Promise<any> {
        try {
            const id = 2; // TODO req.v3.userSession.companyId
            return await jobReportServices.getJobReportDetails(jobReportId, id);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Delete('{jobReportId}')
    @Response(404, 'Job Report not found')
    public async delete(@Path() jobReportId: number): Promise<any> {
        try {
            const id = 2; // TODO req.v3.userSession.companyId
            return await jobReportServices.deleteJobReportById(jobReportId, id);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Post('send')
    public async sendReport(@Body() jobReportId: number): Promise<any> {
        try {
            const companyId = 2; // TODO req.v3.userSession.companyId
            const userId = 2; // TODO req.v3.userSession.companyId
            return await jobReportServices.sendJobReport(jobReportId, companyId, userId);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }

    @Get('email-template/{jobReportId}')
    public async getEmailTemplate(@Path() jobReportId: number): Promise<any> {
        try {
            const id = 2; // TODO req.v3.userSession.companyId
            return await jobReportServices.getJobReportEmailTemplate(jobReportId, id);
        } catch (err) {
            this.setStatus(500);
            return { error: err.message };
        }
    }
}
