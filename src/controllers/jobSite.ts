import { Request, Response } from 'express';
import { Status, Messages } from '../common/constants';

import { JobSite, IJobSite } from '../models/JobSite';
import { JobLocation } from '../models/JobLocation';
import * as Sentry from '@sentry/node';

export const get = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { query: queryParams = {} } = req;
    const { customerId, homeOwnerId, locationId, isActive } = queryParams;

    let query = {};
    if (id) {
        query = { _id: id };
    } else if (customerId && locationId) {
        query = { customerId, locationId };
    } else if (homeOwnerId && locationId) {
        query = {homeOwner: homeOwnerId, locationId};
    } else if (customerId && !homeOwnerId) {
        query = { customerId };
    } else if (customerId && homeOwnerId) {
        query = {$or: [{ customerId }, { homeOwner: homeOwnerId }] };
    } else if (homeOwnerId && !customerId) {
        query = { homeOwner: homeOwnerId };
    } else if (locationId) {
        query = { locationId };
    } 

    switch (isActive) {
    case 'true':
    case true:
        query = {...query, $or: [{ isActive: true }, { isActive: { $exists: false } }] };
        break;

    case 'false':
    case false:
        query = {...query, isActive: false};
        break;

    default:
        // Retrieve all job sites
        query;
    }
    await JobSite.find(query, (err: any, jobSite: any) => {
        if (err) {
            res.status(Status.InternalError);
            res.send(Messages.InternalServerError);
            return;
        }

        res.status(Status.OK);
        res.send(jobSite);
    });
};

export const create = async (req: Request, res: Response) => {
    const params = req.body || {};

    const {
        name,
        location: {
            lat,
            long
        },
        address,
        locationId,
    } = params;

    const missingParams = [];
    if (!locationId) missingParams.push('locationId');
    const isMissingParams = missingParams.length > 0;

    if (isMissingParams) {
        const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`;
        return res.json({ status: Status.Error, message });
    }

    let jobLocation = null;
    try {
        jobLocation = await JobLocation.findById(locationId, {customerId: 1, homeOwner: 1});
        
        if (!jobLocation) {
            return res.json({ status: Status.Error, message: 'Subdivision not found.' });
        }
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: Messages.InternalServerError });
    }
    if (!jobLocation) return;

    await JobSite.create({
        name,
        location: {
            coordinates: [long ?? '', lat ?? '']
        },
        address,
        locationId,
    }, (err: any, jobSite: IJobSite) => {
        if (err) {
            return res.json({ status: Status.Error, message: Messages.InternalServerError });
        } else {
            JobLocation.findByIdAndUpdate(locationId, {
                $push: { jobSites: jobSite._id }
            }).exec();
            res.status(Status.OK);
            return res.send(jobSite);
        }
    });
};

export const update = async (req: Request, res: Response) => {
    const params = req.body;
    const { id } = req.params;
    const {
        name,
        location,
        isActive,
        address,
        locationId,
    } = params;

    const missingParams = [];
    if (!id) missingParams.push('id');
    if (!locationId) missingParams.push('locationId');
    const isMissingParams = missingParams.length > 0;

    if (isMissingParams) {
        const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`;
        return res.json({ status: Status.Error, message });
    }

    let jobLocation = null;
    try {
        jobLocation = await JobLocation.findById(locationId, {customerId: 1, homeOwner: 1});
        if (!jobLocation) {
            return res.json({ status: Status.Error, message: 'Subdivision not found.' });
        }
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: Messages.InternalServerError });
    }
    if (!jobLocation) return;

    const jobSite = await JobSite.findById(id).exec();
    const isJobSiteActive = isActive === undefined || isActive === null
        ? jobSite.isActive
        : isActive === 'false'
            ? false
            : !!isActive;

    JobSite.updateOne({ _id: id }, {
        name: name ?? jobSite.name,
        location: {
            coordinates: [location?.long ?? '', location?.lat ?? '']
        },
        isActive: isJobSiteActive,
        address: address,
        locationId: locationId,
        customerId: jobSite.customerId,
        homeOwner: jobSite.homeOwner || params.homeOwner,
    }, (err: any) => {
        if (err) {
            return res.json({ status: Status.Error, message: Messages.InternalServerError });
        } else {
            return res.json({ status: Status.OK, message: 'Job Address has been updated successfully.' });
        }
    });
};

export const search = async(req: Request, res: Response) => {
    const { keyword }: { keyword: string } = req.query;
    const keywordRegex = { $regex: keyword, $options: 'i' };
    const query = {
        '$or': [
            { name: keywordRegex },
        ]
    };
    const jobSites = await JobSite.find({ ...query }).select("name location address");
    return res.json({ status: Status.Success, jobSites });
}

