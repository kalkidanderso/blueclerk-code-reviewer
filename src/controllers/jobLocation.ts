import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { JobLocation, IJobLocation } from '../models/JobLocation';
import { ICompany } from '../models/Company'
import { Customer } from '../models/Customer'

export const get = (req: Request, res: Response) => {
    const { id } = req.params
    const { query: queryParams = {} } = req
    const { customerId, companyId } = queryParams

    let query = {}
    if (id) {
        query = { _id: id }
    } else if (customerId && companyId) {
        query = { customerId, companyId }
    } else if (customerId) {
        query = { customerId }
    } else if (companyId) {
        query = { companyId }
    }

    JobLocation.find(query, (err: any, jobLocation: any) => {
        if (err) {
            res.status(Status.InternalError)
            res.send(Messages.InternalServerError)
            return
        }

        res.status(Status.OK)
        res.send(jobLocation)
    }).populate('jobSites', 'name location')
}

export const create = (req: Request, res: Response) => {
    const params = req.body
    let companyId = req.companyId
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    const name = params.name;
    const contactName = params.contractName;
    const contactPhone = params.contractPhone;
    const contactEmail = params.contractEmail;
    const locationLat = params.locationLat;
    const locationLong = params.locationLong;
    const street = params.street;
    const city = params.city;
    const state = params.state;
    const zipcode = params.zipcode;
    const customerId = params.customerId;

    if (!(locationLat && locationLong) && !(street && city && state && zipcode)) {
        return res.json({ 'status': Status.Error, 'message': "Either location or address is required." })
    }

    let jobLocationData: any = {
        name,
        contact: {
            name: contactName,
            contactPhone,
            contactEmail
        },
        address: {
            street: street,
            city: city,
            state: state,
            zipcode: zipcode
        },
        customerId,
        companyId
    }
    if(locationLong && locationLat) {
        jobLocationData.location = {coordinates : [locationLong, locationLat]};
    }
    JobLocation.create(jobLocationData, (err: any, jobLocation: IJobLocation) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': err.message});
        }
            Customer.findByIdAndUpdate(customerId, {
                $push: { jobLocations: jobLocation._id }
            }).exec()
        return res.json({ 'status': Status.Success, 'message': "Job Location created successfully!"});
    })
}

export const update = (req: Request, res: Response) => {
    const params = req.body
    const company = <ICompany>req.company
    const companyId = company ? company._id : null
    const { id } = req.params
    const {
        name,
        contact: {
            name: contactName,
            phone,
            email
        },
        location: {
            lat,
            long
        },
        address,
        customerId
    } = params

    const missingParams = []
    if (!id) missingParams.push('id')
    if (!name) missingParams.push('name')
    if (!(lat && long) || !address) missingParams.push('location or address')
    if (!customerId) missingParams.push('customerId')
    if (!companyId) missingParams.push('companyId')
    const isMissingParams = missingParams.length > 0

    if (isMissingParams) {
        const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`
        res.status(Status.MissingParameters)
        res.send(message)
        return () => {}
    }

    JobLocation.updateOne({ _id: id }, {
        name,
        contact: {
            name: contactName,
            phone,
            email
        },
        location: {
            coordinates: [long, lat]
        },
        address,
        customerId,
        companyId
    }, (err: any) => {
        if (err) {
            res.status(Status.InternalError)
            res.send(Messages.InternalServerError)
        } else {
            res.status(Status.OK)
            res.send('job location has been updated successfully.')
        }
    })
}
