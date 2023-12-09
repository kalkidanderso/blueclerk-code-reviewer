import { Controller, Request, Path, Post, Route, Tags, Get, Security, Body, Query, Put, Delete, Response } from "tsoa";
import { Request as RequestExpress } from "express";
import { JobSiteService } from "../../services/v3/jobSites";
import { ICreateJobSiteInput, IJobSite, IUpdateJobSiteArgs } from "../../types/v3/jobSites";
import * as Sentry from '@sentry/node';
@Tags("JobSites")
@Route("job-sites")
export class JobSiteController extends Controller {
    
    /**
     * @summary Get All and Get filter Job Site
     * @param id ID of the Job Site
    */
    @Get("")
    @Security('jwt')
    public async getJobSite(
        @Request() req: RequestExpress,
        @Query() id?: number,
        @Query() customerId?: number,
        @Query() homeOwnerId?: number,
        @Query() locationId?: number,
        @Query() isActive?: boolean | string
    ) : Promise<IJobSite[]> {
        const jobSiteService = new JobSiteService();
        return await jobSiteService.getJobSite({
            id,
            customerId,
            locationId,
            homeOwnerId,
            isActive
        })
    }
    /**
     * @summary Create Job Site
    */
    @Post("")
    @Security('jwt')
    public async addJobSite(
        @Request() req: RequestExpress,
        @Body() params: ICreateJobSiteInput
    ) : Promise<IJobSite> {
        const jobSiteService = new JobSiteService();
        return await jobSiteService.createJobSite(params)
    }
    /**
     * @summary Update Job Site by ID
     * @param id ID of the Job Site
    */
    @Put("{id}")
    @Security('jwt')
    public async updateJobSite(
        @Request() req: RequestExpress,
        @Path() id: number,
        @Body() params: IUpdateJobSiteArgs
    ) : Promise<any> {
        const jobSiteService = new JobSiteService();
        return jobSiteService.updateJobSite({
            id,
            ...params
        })
    }
    /**
     * @summary Delete Job Site by ID
     * @param id ID of the Job Site
    */
    @Delete("{id}")
    @Response(404, "Data Not Found")
    @Security('jwt')
    public async deleteJobSite(
        @Request() req: RequestExpress,
        @Path() id: number
    ) : Promise<any> {
        const jobSiteService = new JobSiteService();
        return jobSiteService.deleteJobSite(id)
    }
}