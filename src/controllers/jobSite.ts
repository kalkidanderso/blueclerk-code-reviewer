import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { JobSite, IJobSite } from '../models/JobSite'
import { ICompany } from '../models/Company'

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

    JobSite.find(query, (err: any, jobSites: any) => {
        if (err) {
            res.status(Status.InternalError)
            res.send(Messages.InternalServerError)
            return
        }

        res.status(Status.OK)
        res.send(jobSites)
    })
}

export const create = (req: Request, res: Response) => {
    const params = req.body
    const company = <ICompany>req.company
    const companyId = company ? company._id : null

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

    JobSite.create({
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
    }, (err: any, jobSite: IJobSite) => {
        if (err) {
            res.status(Status.InternalError)
            res.send(Messages.InternalServerError)
        } else {
            res.status(Status.OK)
            res.send(jobSite)
        }
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

    JobSite.updateOne({ _id: id }, {
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
            res.send()
        }
    })
}