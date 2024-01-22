import { Request, Response } from 'express';
import { Schema } from 'mongoose';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import { Status } from '../common/constants';
import { ICompany } from '../models/Company';
import { IUser, User } from '../models/User';
import { Job } from '../models/Job';
import { JobRoute } from '../models/JobRoute';
import * as Sentry from '@sentry/node';

/**
 *  To retrieve all job routes by today or any filter date provided
 */
export const getAllJobRoutes = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;

    // Initialize startOfDay and endOfDay in UTC format
    const startOfDay = moment(params.scheduleDate).startOf('day').utc().format();
    const endOfDay = moment(params.scheduleDate).endOf('day').utc().format();
    const scheduleDate = moment(params.scheduleDate).format('YYYY-MM-DD');
    const scheduleDateQuery = params.scheduleDate
        ? {
            $or: [
                { scheduleDate: new Date(scheduleDate) },
                { scheduleDate: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) } }]
        }
        : { scheduleDate: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) } };

    // Using aggregate to find Job Route with jobs for contractor
    const jobRoutes = await JobRoute.aggregate([
        {
            $lookup: {
                from: 'jobs',
                localField: 'routes.job',
                foreignField: '_id',
                as: 'jobs'
            }
        },
        {
            $match: {
                $and: [
                    { $or: [ { company }, { 'jobs.company': company._id } ] },
                    scheduleDateQuery,
                ]
            }
        },
        { $project: { jobs: 0 } }
    ]);

    await JobRoute.populate(jobRoutes, [
        {
            path: 'routes.job',
            select: '-__v -comment -charges -salesTax -equipment_scanned -no_of_equipment_scanned',
            populate: [
                { path: 'customer', select: 'profile vendorId address location' },
                // TODO: To be deprecated
                { path: 'contractor', select: 'info address contact' },
                // TODO: To be deprecated
                { path: 'technician', select: 'profile contact' },
                { path: 'tasks.contractor', select: 'info address contact' },
                { path: 'tasks.technician', select: 'profile contact auth.email' },
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'type', select: 'title description sku' },
                { path: 'ticket', select: '-__v -track' },
                { path: 'jobLocation', select: '-__v -contacts -jobSites -customerId -companyId -quickbookId' },
                { path: 'jobSite', select: '-__v -locationId -customerId' }
            ]
        },
        { path: 'technician', select: 'profile contact' },
        { path: 'createdBy', select: 'profile' },
        { path: 'updatedBy', select: 'profile' }
    ]);

    return res.json({ status: Status.Success, jobRoutes: jobRoutes });

};

/**
 * To retrieve job route by schedule date and technician/contractor
 */
export const getJobRoute = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;
    const technician = <IUser>req.technician;
    const contractor = <ICompany>req.contractor;

    // Initialize startOfDay and endOfDay in UTC format
    const startOfDay = moment(params.scheduleDate).startOf('day').utc().format();
    const endOfDay = moment(params.scheduleDate).endOf('day').utc().format();
    const scheduleDate = moment(params.scheduleDate).format('YYYY-MM-DD');
    const scheduleDateQuery = params.scheduleDate
        ? {
            '$or': [
                { scheduleDate: new Date(scheduleDate) },
                { scheduleDate: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) } }]
        }
        : { scheduleDate: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) } };

    const query = {
        company: company._id,
        ...scheduleDateQuery,
        employeeType: params.employeeType,
        technician: technician?._id,
        contractor: contractor?._id
    };

    const jobRoute = await JobRoute.findOne(query).sort({ _id: -1 })
        .populate({
            path: 'routes.job',
            select: '-__v -track -comment -charges -salesTax -equipment_scanned -no_of_equipment_scanned',
            populate: [
                { path: 'customer', select: 'profile vendorId address location notes' },
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'type', select: 'title description sku' },
                { path: 'ticket', select: '-__v -track' },
                { path: 'jobLocation', select: '-__v -contacts -jobSites -customerId -companyId -quickbookId' },
                { path: 'jobSite', select: '-__v -locationId -customerId' }
            ]
        })
        .populate({ path: 'technician', select: 'profile' })
        .populate({ path: 'createdBy', select: 'profile' })
        .populate({ path: 'updatedBy', select: 'profile' });

    return res.json({ status: Status.Success, jobRoute });

};

export const getAllJobRoutesByTechnician = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;
    const technician = <IUser>req.technician;
    const contractor = <ICompany>req.contractor;

    const query:any = {
        company: company._id,
        employeeType: params.employeeType,
        technician: technician?._id,
        contractor: contractor?._id
    };

    if (params.startDate && params.endDate) {
        const startDate = moment(params.startDate).format('YYYY-MM-DD');
        const endDate = moment(params.endDate).format('YYYY-MM-DD');
        query['scheduleDate'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const jobRoute = await JobRoute.find(query).sort({ _id: -1 })
        .populate({
            path: 'routes.job',
            select: '-__v -track -comment -charges -salesTax -equipment_scanned -no_of_equipment_scanned',
            populate: [
                { path: 'customer', select: 'profile vendorId address location notes' },
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'type', select: 'title description sku' },
                { path: 'ticket', select: '-__v -track' },
                { path: 'jobLocation', select: '-__v -contacts -jobSites -customerId -companyId -quickbookId' },
                { path: 'jobSite', select: '-__v -locationId -customerId' }
            ]
        })
        .populate({ path: 'technician', select: 'profile' })
        .populate({ path: 'createdBy', select: 'profile' })
        .populate({ path: 'updatedBy', select: 'profile' });

    return res.json({ status: Status.Success, jobRoute });

};

/**
 * To create a new job route for technician/contractor
 */
export const createJobRoute = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    // const technician = <IUser>req.technician;
    const contractor = <ICompany>req.contractor;

    const routes = [];
    const invalidJobIds = [];
    let parsedRoutes = [];

    // Retrieve technician and check if it is exist
    const technician = await User.findById(params.technicianId);

    if (!technician) {
        return res.json({ status: Status.Error, message: 'Technician not found' });
    }

    try {
        parsedRoutes = JSON.parse(params.routes);

        // To handle any over-stringified strings
        if (!Array.isArray(parsedRoutes)) {
            parsedRoutes = JSON.parse(parsedRoutes);
        }
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: 'routes json is invalid' });
    }

    // No routes found
    if (!parsedRoutes.length) {
        return res.json({ status: Status.Success, message: 'No routes found, nothing to save' });
    }

    let i = 0;
    // Iterate all the routes and give it order number to be saved on DB
    for (const jobId of parsedRoutes) {
        if (!ObjectId.isValid(jobId)) {
            // Collect all not found jobs into an array
            invalidJobIds.push(jobId);
            continue;
        }

        // Retrieve job and check if it is exist
        const job = await Job.findById(jobId);

        if (!job) {
            // Collect all not found jobs into an array
            invalidJobIds.push(jobId);
            continue;
        }

        // Collect all good jobs with the order number
        routes.push({
            order: i += 1,
            job
        });
    }

    // Save the new routes for the technician/contractor
    const jobRoute = new JobRoute({
        company: company._id,
        scheduleDate: moment(params.scheduleDate).format('YYYY-MM-DD'),
        employeeType: params.employeeType ?? 0,
        technician: technician?._id,
        contractor: contractor?._id,
        routes,
        createdBy: user._id
    });
    await jobRoute.save();

    await jobRoute
        .populate({
            path: 'routes.job',
            select: '-__v -track -comment -charges -salesTax -equipment_scanned -no_of_equipment_scanned',
            populate: [
                { path: 'customer', select: 'profile vendorId address location' },
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'type', select: 'title description sku' },
                { path: 'ticket', select: '-__v -track' },
                { path: 'jobLocation', select: '-__v -contacts -jobSites -customerId -companyId -quickbookId' },
                { path: 'jobSite', select: '-__v -locationId -customerId' }
            ]
        })
        .populate({ path: 'technician', select: 'profile' })
        .populate({ path: 'createdBy', select: 'profile' })
        .populate({ path: 'updatedBy', select: 'profile' })
        .execPopulate();

    return res.json({ status: Status.Success, message: 'Job route created successfully', jobRoute, invalidJobIds });

};

/**
 * To update one job route
 */
export const updateJobRoute = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    const routes = [];
    const invalidJobIds = [];
    let parsedRoutes = [];

    // Retrieve job route and check if it is exist
    const jobRoute = await JobRoute.findOne({ _id: params.jobRouteId, company });

    if (!jobRoute) {
        return res.json({ status: Status.Error, message: 'Job Route not found' });
    }

    try {
        parsedRoutes = JSON.parse(params.routes);

        // To handle any over-stringified strings
        if (!Array.isArray(parsedRoutes)) {
            parsedRoutes = JSON.parse(parsedRoutes);
        }
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: 'routes json is invalid' });
    }

    // No routes found
    if (!parsedRoutes?.length) {
        return res.json({ status: Status.Success, message: 'No routes found, nothing to save' });
    }

    let i = 0;
    // Iterate all the routes and give it order number to be saved on DB
    for (const jobId of parsedRoutes) {
        if (!ObjectId.isValid(jobId)) {
            // Collect all not found jobs into an array
            invalidJobIds.push(jobId);
            continue;
        }

        // Retrieve job and check if it is exist
        const job = await Job.findById(jobId);

        if (!job) {
            // Collect all not found jobs into an array
            invalidJobIds.push(jobId);
            continue;
        }

        // Collect all good jobs with the order number
        routes.push({
            order: i += 1,
            job
        });
    }

    // Update the data on the current job route and save
    jobRoute.routes = routes;
    jobRoute.updatedBy = user;
    await jobRoute.save();

    return res.json({ status: Status.Success, message: 'Job route updated successfully.', jobRoute, invalidJobIds });

};

/**
 *
 * To add / remove a new created or updated job to existing job route,
 * if on that scheduleDate existed a job route for the technician
 */
export const _addOrRemoveJobRoutes = async (technicianId: string, scheduleDate: Date, action: string, jobId: Schema.Types.ObjectId) => {

    const startOfDay = moment(scheduleDate).startOf('day').utc().format();
    const endOfDay = moment(scheduleDate).endOf('day').utc().format();
    const scheduleDateStr = moment(scheduleDate).format('YYYY-MM-DD');
    const scheduleDateQuery = {
        '$or':
            [
                { scheduleDate: new Date(scheduleDateStr) },
                { scheduleDate: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) } }
            ]
    };

    const query = {
        technician: technicianId,
        ...scheduleDateQuery
    };

    // Retrieve the job route for the technician if exist
    const jobRoute = await JobRoute.findOne(query).sort({ _id: -1 });

    if (!jobRoute) {
        return;
    }

    switch (action) {
    case 'ADD':
        // Add the job to the job routes
        jobRoute.routes.push({
            order: jobRoute.routes.length + 1,
            job: jobId
        });
        break;

    case 'REMOVE':
        // Remove the job from job routes
        const routes = jobRoute.routes.filter(route => route.job.toString() !== jobId.toString());

        // Reorder the order of the route
        let i = 0;
        for (const route of routes) {
            route.order = (i += 1);
        }

        jobRoute.routes = routes;
        break;

    default:
        break;
    }

    await jobRoute.save();
    return;

};
