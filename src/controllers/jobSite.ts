import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { JobSite, IJobSite } from '../models/JobSite'
import { JobLocation } from '../models/JobLocation'

export const get = (req: Request, res: Response) => {
    const { id } = req.params
    const { query: queryParams = {} } = req
    const { customerId, locationId } = queryParams

    let query = {}
    if (id) {
        query = { _id: id }
    } else if (customerId && locationId) {
        query = { customerId, locationId }
    } else if (customerId) {
        query = { customerId }
    } else if (locationId) {
        query = { locationId }
    }

    JobSite.find(query, (err: any, jobSite: any) => {
        if (err) {
            res.status(Status.InternalError)
            res.send(Messages.InternalServerError)
            return
        }

        res.status(Status.OK)
        res.send(jobSite)
    })
}

export const create = async (req: Request, res: Response) => {
    const params = req.body || {}

    const {
        name,
        location: {
            lat,
            long
        },
        address,
        locationId
    } = params

    const missingParams = []
    if (!(lat && long) || !address) missingParams.push('location or address')
    if (!locationId) missingParams.push('locationId')
    const isMissingParams = missingParams.length > 0

    if (isMissingParams) {
        const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`
        res.status(Status.MissingParameters)
        res.send(message)
        return () => {}
    }

    let jobLocation = null
    try {
        jobLocation = await JobLocation.findById(locationId, 'customerId')
        if (jobLocation == null) {
            res.status(Status.MissingParameters)
            res.send('No location was found for provided locationId')
        }
    } catch (err) {
        res.status(Status.InternalError)
        res.send(Messages.InternalServerError)
    }
    if (!jobLocation) return
    const { customerId = null } = jobLocation || {}

    JobSite.create({
        name,
        location: {
            coordinates: [long, lat]
        },
        address,
        locationId,
        customerId
    }, (err: any, jobSite: IJobSite) => {
        if (err) {
            res.status(Status.InternalError)
            res.send(Messages.InternalServerError)
        } else {
            JobLocation.findByIdAndUpdate(locationId, {
                $push: { jobSites: jobSite._id }
            }).exec()
            res.status(Status.OK)
            res.send(jobSite)
        }
    })
}

export const update = async (req: Request, res: Response) => {
    const params = req.body
    const { id } = req.params
    const {
        name,
        location: {
            lat,
            long
        },
        address,
        locationId
    } = params

    const missingParams = []
    if (!id) missingParams.push('id')
    if (!(lat && long) || !address) missingParams.push('location or address')
    if (!locationId) missingParams.push('locationId')
    const isMissingParams = missingParams.length > 0

    if (isMissingParams) {
        const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`
        res.status(Status.MissingParameters)
        res.send(message)
        return () => {}
    }

    let jobLocation = null
    try {
        jobLocation = await JobLocation.findById(locationId, 'customerId')
        if (jobLocation == null) {
            res.status(Status.MissingParameters)
            res.send('No location was found for provided locationId')
        }
    } catch (err) {
        res.status(Status.InternalError)
        res.send(Messages.InternalServerError)
    }
    if (!jobLocation) return
    const { customerId = null } = jobLocation || {}

    JobSite.updateOne({ _id: id }, {
        name,
        location: {
            coordinates: [long, lat]
        },
        address,
        locationId,
        customerId
    }, (err: any) => {
        if (err) {
            res.status(Status.InternalError)
            res.send(Messages.InternalServerError)
        } else {
            res.status(Status.OK)
            res.send('Job Site has been updated successfully.')
        }
    })
}