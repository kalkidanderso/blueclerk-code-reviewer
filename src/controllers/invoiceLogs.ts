import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { IInvoiceLogs } from '../models/invoiceLogs';
import { InvoiceLogs } from '../models/invoiceLogs';
import * as Sentry from '@sentry/node';

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

export const create = async (data: IInvoiceLogs) => {
   try{
    console.log("data",data);
    
    const logItem = new InvoiceLogs(data)

    await logItem.save();
     } 
    catch(err){
        console.log(err);
        Sentry.captureException("error logging invoice",err);
    }
}
