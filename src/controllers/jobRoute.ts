import { Request, Response } from 'express';
import { Status } from '../common/constants';
import { Company, ICompany } from '../models/Company';
import { User, IUser } from '../models/User';
import { Job } from '../models/Job';
import { JobRoute } from '../models/JobRoute';

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

    console.log('== query:', query);

    const jobRoute = await JobRoute.findOne(query)
        .populate({ path: 'technician', select: '-auth -address -location -permissions -emailPreferences -contact -contacts -company -__v' })
        .populate({ path: 'routes.job', select: '-track -__v' })
        .populate({ path: 'createdBy', select: 'profile '})

    return res.json({ status: Status.Success, jobRoute });

}

export const createJobRoute = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    const technician = <IUser>req.technician;
    const contractor = <ICompany>req.contractor;

    const routes = [];
    let parsedRoutes = [];
    let isValid = true;

    try {
        parsedRoutes = JSON.parse(params.routes);

        // To handle any over-stringified strings
        if (!Array.isArray(parsedRoutes)) {
            parsedRoutes = JSON.parse(parsedRoutes);
        }
    } catch (err) {
        return res.json({ status: Status.Error, message: 'routes json is invalid' });
    }

    if (!parsedRoutes.length) {
        return res.json({ status: Status.Success, message: 'No routes found, nothing to save' });
    }

    // Sort the parsed routes by the order
    parsedRoutes.sort((a: any, b: any) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0));
    // Check if order is in sequence
    for (let i = 0; i < parsedRoutes.length; i++) {
        if (parsedRoutes[i]?.order !== i + 1) {
            isValid = false;
            break;
        }
    }

    for (const route of parsedRoutes) {
        const job = await Job.findById(route.jobId);
        routes.push({ order: route.order, job });
    }

    // There is a missing order, return error
    if (!isValid) {
        return res.json({ status: Status.Error, message: 'routes order is not in sequence' });
    }

    // Save the new routes for the technician/contractor
    const jobRoute = new JobRoute({
        company,
        scheduleDate: new Date(params.scheduleDate),
        employeeType: params.employeeType,
        technician, contractor,
        routes,
        createdBy: user
    });

    await jobRoute.save();

    return res.json({ status: Status.Success, message: 'Job route created successfully', jobRoute });

}
