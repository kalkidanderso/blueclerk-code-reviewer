import { Controller, Request, Path, Post, Route, Tags, Get, Security, Body, Middlewares } from "tsoa";
import {Types, Schema} from 'mongoose';
import { Request as RequestExpress } from "express";
import { Job } from "../../../models/Job";

interface IResJob {
    id: string;
    jobId: string;
}

interface IJobInput {
    name: string;
}

interface IRes {
    status: number;
    message: string;
}

@Tags("Jobs")
@Route("jobs")
export class JobsController extends Controller {
    @Get("{id}")
    @Security('jwt')
    public async getJob(
        @Request() req: RequestExpress,
        @Path() id: string,
    ) : Promise<IResJob> {
        const job = await Job.findById(id);

        return {
            id: job._id ,
            jobId: job.jobId
        };

    }

    @Post("")
    @Security('jwt')
    public async addJob(
        @Request() req: RequestExpress,
        @Body() body: IJobInput
    ) : Promise<IRes> {
        return {
            status: 1,
            message: "Job added"
        };

    }
}