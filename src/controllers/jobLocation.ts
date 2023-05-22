import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { JobLocation, IJobLocation } from '../models/JobLocation';
import { IUser } from '../models/User';
import { ICompany } from '../models/Company'
import { Customer } from '../models/Customer'
import { Contact } from '../models/Contact'
import { _createQBCustomerJob, _updateQBCustomerJob } from './quickbook.customer';
import { HomeOwner } from '../models/HomeOwner';
import Sentry from "@sentry/node";

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

}

export const get = (req: Request, res: Response) => {
    const { id } = req.params
    const { query: queryParams = {} } = req
    const loggedInCompanyId = req.companyId;
    let { customerId, homeOwnerId, companyId, isActive } = queryParams
    let query = {}

    if (!id && !customerId && !companyId && loggedInCompanyId) {
        companyId = loggedInCompanyId;
    }
    if (id) {
        query = { _id: id }
    } else if (customerId && companyId) {
        query = { customerId, companyId }
    } else if (homeOwnerId && companyId) {
        query = { homeOwner: homeOwnerId, companyId }
    } else if (customerId && !homeOwnerId) {
        query = { customerId }
    } else if (homeOwnerId && !customerId) {
        query = { homeOwner: homeOwnerId }
    } else if(homeOwnerId && customerId) {
        query =  { $or: [{ homeOwner: homeOwnerId }, { customerId }] }
    } else if (companyId) {
        query = { companyId }
    }

    switch (isActive) {
        case 'true':
        case true:
            query = { ...query, $or: [{ isActive: true }, { isActive: { $exists: false } }] };
            break;

        case 'false':
        case false:
            query = { ...query, isActive: false };
            break;

        default:
            // Retrieve all job location, query is good at this point
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
    })
}

export const create = async (req: Request, res: Response) => {
    const params = req.body
    let companyId = req.companyId
    const company = req.company
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    const name = params.name;
    const contact = params.contact ? JSON.parse(params.contact) : {};
    const locationLat = params.locationLat;
    const locationLong = params.locationLong;
    const street = params.street;
    const city = params.city;
    const state = params.state;
    const zipcode = params.zipcode;
    const customerId = params.customerId;
    const homeOwnerId = params.homeOwnerId;

    if (!(locationLat && locationLong) && !(street && city && state && zipcode)) {
        return res.json({'status': Status.Error, 'message': "Either location or address is required."})
    }
    let jobLocationData: any = {
        name,
        address: {
            street: street,
            city: city,
            state: state,
            zipcode: zipcode
        },
        contacts: [],
        companyId
    }

    if (!customerId && !homeOwnerId) {
        return res.json({ status: Status.Error, message: 'Either one of customerId or homeOwnerId should be provided'})
    }

    if (homeOwnerId) {
        jobLocationData.homeOwner = homeOwnerId;
    }

    // default to customer
    if (customerId) {
        jobLocationData.homeOwner = null;
        jobLocationData.customerId = customerId;
    }

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
        const customer = await Customer.findById(customerId);
        const homeOwner = await HomeOwner.findById(homeOwnerId);

        customer ? customer.jobLocations.push(jobLocation._id) : homeOwner.jobLocations.push(jobLocation._id);
        customer ? await customer.save() : await homeOwner.save();

        await jobLocation
            .populate({ path: 'jobSites', select: '-__v -locationId -customerId -homeOwner' })
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
    })
}

export const update = async (req: Request, res: Response) => {

    const params = req.body;
    const { id } = req.params;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // Find and check if customer existed
    const customer = await Customer.findOne({ _id: params.customerId });
    const homeOwner = await HomeOwner.findById(params?.homeOwnerId);

    if (!params.customerId && !params.homeOwnerId) {
        return res.json({ status: Status.Error, message: 'Either one of customerId or homeOwnerId should be provided' });
    }

    if (!customer && !homeOwner) {
        return res.json({ status: Status.NotFound, message: 'Customer or home owner not found.' });
    }

    if (params.customerId && !customer) {
        return res.json({ status: Status.NotFound, message: 'Customer not found.' });
    }

    if (params.homeOwnerId && !homeOwner) {
        return res.json({ status: Status.NotFound, message: 'Home owner not found.' });
    }

    let query
    if (customer) {
        query = { customerId: customer?._id }
    }

    if (homeOwner) {
        query = { homeOwner: homeOwner?._id }
    }

    // Find and check if job locatino existed
    const jobLocation = await JobLocation.findOne({
        companyId: company._id,
        ...query,
        _id: id
    });

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
        .populate({ path: 'jobSites', select: '-__v -locationId -customerId -homeOwner' })
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
            })
        })
    } else {
        return res.json({ status: Status.Success, message: 'Subdivision updated successfully.', jobLocation });
    }


}
