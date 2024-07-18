import { Request, Response } from 'express';
import { Status } from '../common/constants';

import { JobLocation, IJobLocation } from '../models/JobLocation';
import { IUser } from '../models/User';
import { Company, ICompany } from '../models/Company';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';
import { _createQBCustomerJob, _updateQBCustomerJob } from './quickbook.customer';
import * as Sentry from '@sentry/node';

/**
 * To reset Job Location quickbookId,
 * used when /disconnectQB API called
 */
export const _resetJobLocationQB = (company: ICompany): void => {

    JobLocation.updateMany(
        { companyId: company._id, quickbookId: { $ne: null } },
        { $set: { quickbookId: null } }
    ).exec();

    return;

};

export const get = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { query: queryParams = {} } = req;
    const loggedInCompanyId = req.companyId;
    const { isActive } = queryParams;
    let { customerId, builderId } = queryParams;
    let query = {};

    if(customerId && !builderId) {
        const customer = await Customer.findById(customerId);
        builderId = customer.companyId;
    }

    if (!id && !customerId && loggedInCompanyId) {
        customerId = loggedInCompanyId;
    }
    query = {
        ...(id ? { _id: id } : {}),
        ...(builderId ? { builderId } : {}),
    };


    switch (isActive) {
    case 'true':
    case true:
        query = { ...query, $or: [{ isActive: true }, { isActive: { $exists: false } }] };
        break;
    case 'false':
    case false:
        query = { ...query, isActive: false };
        break;
    // Retrieve all job location, query is good at this point
    default:
        break;
    }

    JobLocation.find(query)
        .populate('jobSites', '-__v -locationId -customerId -homeOwner')
        .populate('contacts', '-__v')
        .exec().then((jobLocations: any) => {
            return res.json(jobLocations);
        }).catch((err) => {
            Sentry.captureException(err);
            return res.json({'status': Status.Error, 'message': err.message});
        });
};

export const create = async (req: Request, res: Response) => {
    const params = req.body;
    const company = req.company;
    const name = params.name;
    const contact = params.contact ? JSON.parse(params.contact) : {};
    const locationLat = params.locationLat;
    const locationLong = params.locationLong;
    const street = params.street;
    const city = params.city;
    const state = params.state;
    const zipcode = params.zipcode;
    const customerId = params.customerId;

    if (!(locationLat && locationLong) && !(street && city && state && zipcode)) {
        return res.json({'status': Status.Error, 'message': 'Either location or address is required.'});
    }

    if (!customerId) {
        return res.json({ status: Status.Error, message: 'BuilderId should be provided'});
    }

    const customer = await Customer.findById(customerId);

    const jobLocationData: any = {
        name,
        address: {
            street: street,
            city: city,
            state: state,
            zipcode: zipcode
        },
        contacts: [],
        builderId: customer.companyId
    };

    if (contact?.name || contact?.phone || contact?.email) {
        const contactEntry = new Contact({
            name: contact?.name,
            phone: contact?.phone,
            email: contact?.email
        });
        await contactEntry.save();
        jobLocationData.contacts.push(contactEntry._id);
    }

    if (locationLong && locationLat) {
        jobLocationData.location = {coordinates: [locationLong, locationLat]};
    }
    JobLocation.create(jobLocationData).then(async (jobLocation: IJobLocation) => {
        const customerCompany = await Company.findOne({ companyId: customer.companyId });
        customerCompany.jobLocations.push(jobLocation._id);
        await customer.save();

        await jobLocation
            .populate({ path: 'jobSites', select: '-__v -locationId -customerId' })
            .populate({ path: 'contacts', select: '-__v' })
            .execPopulate();

        if (company.qbAuthorized && customer?.quickbookId) {
            // Create QB Customer Job
            _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, (err, errMsg, qbCustomerJob) => {
                if (err) {
                    return res.json({ status: err, message: errMsg });
                }

                if (qbCustomerJob) {
                    // Create new Customer in QuickBooks
                    jobLocation.quickbookId = qbCustomerJob.Id;
                    jobLocation.save();
                }

                return res.json({ status: Status.Success, message: 'Subdivision created successfully.', jobLocation, quickbookCustomerJob: qbCustomerJob });
            });
        } else {
            return res.json({ status: Status.Success, message: 'Subdivision created successfully.', jobLocation });
        }

    }).catch((err) => {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    });
};

export const update = async (req: Request, res: Response) => {

    const params = req.body;
    const { id } = req.params;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // Find and check if customer existed
    if (!params.customerId) {
        return res.json({ status: Status.Error, message: 'CustomerId must be provided' });
    }

    const customer = await Customer.findOne({ _id: params.customerId });

    if (!customer) {
        return res.json({ status: Status.NotFound, message: 'Customer not found.' });
    }


    // Find and check if job locatino existed
    const jobLocation = await JobLocation.findById(id);

    if (!jobLocation) {
        return res.json({ status: Status.Error, message: 'Subdivision not found.' });
    }

    // Check the value of params req.body.isActive
    const currentIsActive = jobLocation.isActive;
    const isActive = params.isActive === undefined || params.isActive === null
        ? jobLocation.isActive
        : params.isActive === 'false' || params.isActive === '0'
            ? false
            : !!params.isActive;

    // Update job location
    jobLocation.name = params.name ?? jobLocation.name;
    jobLocation.isActive =  isActive;
    jobLocation.address.street = params.street ?? jobLocation.address?.street;
    jobLocation.address.city = params.city ?? jobLocation.address?.city;
    jobLocation.address.state = params.state ?? jobLocation.address?.state;
    jobLocation.address.zipcode = params.zipcode ?? jobLocation.address?.zipcode;
    if (params.locationLong && params.locationLat) {
        jobLocation.location = {coordinates: [params.locationLong, params.locationLat]};
    }
    if (currentIsActive && !isActive) {
        jobLocation.inactiveAt = new Date();
        jobLocation.inactiveBy = user._id;
    } else if (isActive) {
        jobLocation.inactiveAt = null;
        jobLocation.inactiveBy = null;
    }
    await jobLocation.save();

    await jobLocation
        .populate({ path: 'jobSites', select: '-__v -locationId -customerId' })
        .populate({ path: 'contacts', select: '-__v' })
        .execPopulate();

    if (company.qbAuthorized && customer?.quickbookId && jobLocation.quickbookId) {
        // Sync the update to Customer Job in QuickBooks
        _updateQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, (err, errMsg, qbCustomerJob) => {
            if (err) {
                return res.json({ status: err, message: errMsg });
            }

            if (qbCustomerJob) {
                // If company's customers already synced, update the synced date
                if (company.qbSync?.customersSynced) {
                    company.qbSync.customersSyncedAt = new Date();
                    company.save();
                }
            }

            return res.json({
                status: Status.Success,
                message: 'Subdivision updated successfully.',
                jobLocation,
                quickbookCustomerJob: qbCustomerJob
            });
        });
    } else {
        return res.json({ status: Status.Success, message: 'Subdivision updated successfully.', jobLocation });
    }
};

export const search = async(req: Request, res: Response) => {
    const { keyword }: { keyword: string } = req.query;
    
    const keywordRegex = { $regex: keyword, $options: 'i' };
    const query = {
        '$or': [
            { name: keywordRegex },
        ]
    };
    const jobLocations = await JobLocation.find({ ...query }).select("name location address");
    return res.json({ status: Status.Success, jobLocations });
}
