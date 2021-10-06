import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import { Status } from '../common/constants';
import { ICompany } from '../models/Company';
import { IUser, User } from '../models/User';
import { Job } from '../models/Job';
import { JobRoute } from '../models/JobRoute';

/**
 *  To retrieve all job routes by today or any filter date provided
 */
export const getAllJobRoutes = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;

    // Initialize startOfDay and endOfDay in UTC format
    const startOfDay = moment(params.scheduleDate).startOf('day').utc();
    const endOfDay = moment(params.scheduleDate).endOf('day').utc();

    const jobRoutes = await JobRoute.find({
        $and: [
            { company },
            { scheduleDate: { $gte: startOfDay } },
            { scheduleDate: { $lte: endOfDay } }
        ]
    })
        .populate({
            path: 'routes.job',
            select: '-__v -track -comment -charges -salesTax -equipment_scanned -no_of_equipment_scanned',
            populate: [
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'type', select: 'title description sku' },
                { path: 'ticket', select: '-__v -track' },
                { path: 'jobLocation', select: '-__v -contacts -jobSites -customerId -companyId -quickbookId' },
                { path: 'jobSite', select: '-__v -locationId -customerId' }
            ]
        })
        .populate({ path: 'technician', select: 'profile' })
        .populate({ path: 'createdBy', select: 'profile' })
        .populate({ path: 'updatedBy', select: 'profile' });

    return res.json({ status: Status.Success, jobRoutes });

}

/**
 * To retrieve job route by schedule date and technician/contractor
 */
export const getJobRoute = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;
    const technician = <IUser>req.technician;
    const contractor = <ICompany>req.contractor;

    const query = {
        company: company._id,
        scheduleDate: params.scheduleDate,
        employeeType: params.employeeType,
        technician: technician?._id,
        contractor: contractor?._id
    };

    const jobRoute = await JobRoute.findOne(query)
        .populate({ path: 'technician', select: '-auth -address -location -permissions -emailPreferences -contact -contacts -company -__v' })
        .populate({ path: 'routes.job', select: '-track -__v' })
        .populate({ path: 'createdBy', select: 'profile '})

    return res.json({ status: Status.Success, jobRoute });

}

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
        scheduleDate: new Date(params.scheduleDate),
        employeeType: params.employeeType ?? 0,
        technician: technician?._id,
        contractor: contractor?._id,
        routes,
        createdBy: user._id
    });
    await jobRoute.save();

    return res.json({ status: Status.Success, message: 'Job route created successfully', jobRoute, invalidJobIds });

}

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

}
