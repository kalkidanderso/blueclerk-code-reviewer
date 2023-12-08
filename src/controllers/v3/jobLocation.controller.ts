import { Controller, Request, Path, Post, Route, Tags, Get, Security, Body, Query, Put, Delete, Response } from "tsoa";
import { Request as RequestExpress } from "express";
import { JobLocationService } from "../../services/v3/jobLocation";
import { ICreatedJobLocation, IUpdateJobLocation } from "../../types/v3/jobLocation";
@Tags("JobLocation")
@Route("job-location")
export class JobLocationController extends Controller {
    
    /**
     * @summary Create Job Location
    */
    @Post()
    @Security('jwt')
    public async addJobLocation(
        @Request() req: RequestExpress,
        @Body() body: ICreatedJobLocation
    ) : Promise<any> {
        const jobLocationService = new JobLocationService();
        return await jobLocationService.createJobLocation(body)
    }
    /**
     * @summary Get All and Get filter Job Location
     * @param id ID of the Job Location
    */
    @Get()
    @Security('jwt')
    public async getJobLocation(
        @Request() req: RequestExpress,
        @Query() id?: number,
        @Query() customerId?: number,
        @Query() companyId?: number,
        @Query() isActive?: boolean | string
    ) : Promise<any> {
        const jobLocationService = new JobLocationService();
        return await jobLocationService.GetJobLocationFilter({
            id,
            customerId,
            companyId,
            isActive
        })
    }
        /**
     * @summary Update Job Location by ID
     * @param id ID of the Job Location
    */
        @Put("reset-quick-book")
        @Security('jwt')
        public async updateResetQbJobLocation(
            @Request() req: RequestExpress,
            @Body() params: {companyId:number}
        ) : Promise<any> {
            const jobLocationService = new JobLocationService();
            return await jobLocationService.updateQbJobLocation(params.companyId)
        }
    /**
     * @summary Update Job Location by ID
     * @param id ID of the Job Location
    */
    @Put("{id}")
    @Security('jwt')
    public async updateJobLocation(
        @Request() req: RequestExpress,
        @Path() id: number,
        @Body() params: IUpdateJobLocation  
    ) : Promise<any> {
        const jobLocationService = new JobLocationService();
        return await jobLocationService.updateJobLocation(id, params)
    }
    /**
     * @summary Delete Job Location by ID
     * @param id ID of the Job Location
    */
    @Delete("{id}")
    @Response(404, "Data Not Found")
    @Security('jwt')
    public async deleteJobLocation(
        @Request() req: RequestExpress,
        @Path() id: number
    ) : Promise<any> {
        const jobLocationService = new JobLocationService();
        return await jobLocationService.deleteJobLocationById(id)
    }
}