import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import * as helper from '../../services/helper';
import { Customer } from '../../models/Customer';
import { JobLocation } from '../../models/JobLocation';
import { JobSite } from '../../models/JobSite';
import { Company } from '../../models/Company';
import { Job, IJob } from '../../models/Job';
import { splitArray } from './common';
import { DefaultPageSize, Status } from '../../common/constants';
import { User } from '../../models/User';

export const getJobs = async (req: Request, res: Response) => {

    const bodyParams = req.body;
    const queryParams = req.query;
    const companyId = req.otherCompanyId || req.companyId;
    const currentPage = bodyParams.currentPage || 0;
    const pageSize = bodyParams.pageSize || DefaultPageSize;
    const { keyword } = bodyParams;
    // Data query that used to search Invoices and available previous/next page
    const initialQuery: any = {
        $and: [{
            $or: [
                { 'tasks.contractor': companyId },
                { contractor: companyId },
                { company: companyId }
            ]
        }]
    };

    _fillInitialQuery(bodyParams, queryParams, initialQuery);

    const filteredInitialJobs = await Job.aggregate([
        { $match: initialQuery },
        {
            $project:
            {
                customer: 1,
                jobLocation: 1,
                jobSite: 1,
                "tasks.technician": 1,
                "tasks.contractor": 1,
            },
        },
    ]);


    // Split the initial jobs into subarrays with 30,000 length, to do parallel processing
    const filteredInitialJobsSplited = splitArray(filteredInitialJobs, 30000);
    const parallelFilter = filteredInitialJobsSplited.map((value: any[]) => _getFinalJobsIds(value, bodyParams));
    const finalJobsIds = (await Promise.all(parallelFilter)).flat()
    const finalQuery: any = {
        $and: [{ _id: { $in: finalJobsIds } }]
    }
    const total = await Job.aggregate([
        { $match: finalQuery },
        {
            $count: "count"
        }
    ]);

    const jobs: IJob[] = await Job.aggregate([
        { $match: finalQuery },
        {
            $sort: { updatedAt: -1 }
        },
        { $skip: (currentPage * pageSize) },
        { $limit: pageSize || DefaultPageSize },
        {
            $lookup: {
                from: 'customers',
                localField: 'customer',
                foreignField: '_id',
                as: 'customerObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            profile: 1,
                            info: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'servicetickets',
                localField: 'ticket',
                foreignField: '_id',
                as: 'ticketObj'
            }
        },
        {
            $lookup: {
                from: 'joblocations',
                localField: 'jobLocation',
                foreignField: '_id',
                as: 'jobLocationObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            address: 1,
                            location: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'jobsites',
                localField: 'jobSite',
                foreignField: '_id',
                as: 'jobSiteObj'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'tasks.technician',
                foreignField: '_id',
                as: 'technicianObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            profile: 1,
                            info: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'companies',
                localField: 'tasks.contractor',
                foreignField: '_id',
                as: 'contractorsObj'
            }
        },
        {
            $lookup: {
                from: 'homeowners',
                localField: 'homeOwner',
                foreignField: '_id',
                as: 'homeOwnerObj'
            }
        },
        {
            $lookup: {
                from: 'jobtypes',
                localField: 'tasks.jobTypes.jobType',
                foreignField: '_id',
                as: 'jobTypeObj'
            }
        },
        {
            $project: {
                "_id": 1,
                "jobId": 1,
                "status": "$status",
                "isHomeOccupied": "$isHomeOccupied",
                "createdBy": "$createdBy",
                "description": "$description",
                "tasks": "$tasks",
                "track": "$track",
                "customerObj": "$customerObj",
                "homeOwnerObj": "$homeOwnerObj",
                "jobLocationObj": "$jobLocationObj",
                "jobSiteObj": "$jobSiteObj",
                "scheduledStartTime": "$scheduledStartTime",
                "scheduledEndTime": "$scheduledEndTime",
                "technicianObj": "$technicianObj",
                "contractorsObj": "$contractorsObj",
                "jobTypeObj": "$jobTypeObj",
                "ticketObj": "$ticketObj",
                "scheduleDate": "$scheduleDate",
                "scheduleTimeAMPM": "$scheduleTimeAMPM"
            }
        }
    ]);

    return res.json({
        status: Status.Success,
        jobs,
        total: total[0]?.count
    });
}


/**
 * ===================================
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */


/**
 * Check and add if params filter provided to initial query
 * @param params params provided on the request
 * @param query query to be filled
 */
const _fillInitialQuery = (bodyParams: any, queryParams: any, query: any) => {
    const { technicianIds, status, startDate, endDate, customerId,
    } = bodyParams;
    const { workType, companyLocation } = queryParams;

    let technicianIdsToFilter: any[];

    if (technicianIds) {
        // Validate is technician ids is already array or object
        technicianIdsToFilter = Array.isArray(technicianIds)
            ? technicianIds
            : technicianIds.split(',')
    }
    if (technicianIdsToFilter?.length > 0) {
        // convert technician Id from string to objectId and remove falsy value 
        const technicians = technicianIdsToFilter.map(technicianId => {
            if (ObjectId.isValid(technicianId)) return new ObjectId(technicianId);
        });
        query['$and'].push({
            $or: [
                { 'tasks.technician': { $in: technicians } },
                { 'tasks.contractor': { $in: technicians } }
            ]
        });
    }

    if (status) {
        query['$and'].push({ status: status });
    }

    if (startDate && endDate) {
        const startDateMoment = moment(startDate).format('YYYY-MM-DD');
        const endDateMoment = moment(endDate).format('YYYY-MM-DD');
        query['$and'].push({ scheduleDate: { $gte: new Date(startDateMoment), $lte: new Date(endDateMoment) } });
    }

    if (customerId) {
        query['$and'].push({ customer: new ObjectId(customerId) });
    }

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            let workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            });
        } catch (error) { };
        if (workTypeIds.length > 0) {
            query['$and'].push({ workType: { $in: workTypeIds } });
        }

    }

    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            let companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            });
        } catch (error) { }
        if (companyLocationIds.length > 0) {

        }
        query['$and'].push({ companyLocation: { $in: companyLocationIds } });
    }
}

/**
 * Get the customers ids linked to the invoices filtered by ids and keyword
 * @param customersIds the customer ids to be filtered
 * @param keywordRegex the keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const _getFilteredCustomerIds = async (customersIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    if (!keywordRegex) {
        return customersIds;
    }
    const query: any = {
        $and: [{
            _id: {
                $in: customersIds,
            },
        },]
    };
    query['$and'].push({ "profile.displayName": keywordRegex })
    const filteredCustomersIds = (await Customer.aggregate(
        [
            {
                $match: query
            },
            {
                $project:
                {
                    _id: 1,
                },
            },
        ]
    )).map((value) => value._id)
    return filteredCustomersIds;
}

/**
 * Get jobs location ids filtered by ids and keyword
 * @param jobLocationIds job locations ids to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const _getFilteredJobLocationsIds = async (jobLocationsIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    if (!keywordRegex) {
        return jobLocationsIds
    }
    const query: any = {
        $and: [{
            _id: {
                $in: jobLocationsIds,
            },
        },]
    };
    query['$and'].push({ name: keywordRegex })

    const filteredJobLocationsIds = (await JobLocation.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredJobLocationsIds;
}

/**
 * Get technician ids filtered by ids and keyword
 * @param techniciansIds ids to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const _getFilteredTechniciansIds = async (techniciansIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    //early return
    if (!keywordRegex) {
        return techniciansIds
    }
    const query: any = {
        $and: [{
            _id: {
                $in: techniciansIds,
            },
        },]
    };
    query['$and'].push({ "profile.displayName": keywordRegex });

    const filteredTechniciansIds = (await User.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredTechniciansIds;
}

/**
 * Get two array of job sites ids filtered by ids and keyword
 * @param jobSitesIds job sites ids to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const _getFilteredJobSitesIds = async (jobSitesIds: ObjectId[], keywordRegex?: any):
    Promise<ObjectId[]> => {

    if (!keywordRegex) {
        return jobSitesIds;
    }
    //and query
    const query: any = {
        $and: [{
            _id: {
                $in: jobSitesIds,
            },
        },]
    };
    query['$and'].push({ name: keywordRegex });
    const filteredJobSitesIds = (await JobSite.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredJobSitesIds;
}

/**
 * Get contractors/companies ids filtered by ids and keyword
 * @param contractorsIds ids to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise <ObjectId[]>
 */
const _getFilteredContractorsIds = async (contractorsIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    //early return
    if (!keywordRegex) {
        return contractorsIds
    }
    const query: any = {
        $and: [{
            _id: {
                $in: contractorsIds,
            },
        },]
    };
    query['$and'].push({
        "info.companyName": keywordRegex
    });
    const filteredContractorsIds = (await Company.aggregate([
        {
            $match: query,
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredContractorsIds;
}

/**
 * Get the ids of final filtered jobs
 * @param filteredInitialJobs the initial filtered jobs ids
 * @param params params received on the request to filter
 * @returns Promise<ObjectId[]>
 */
const _getFinalJobsIds = async (filteredInitialJobs: any[], params: any): Promise<ObjectId[]> => {
    // Get the ids linked to the jobs and that they are on other collections
    const jobsIds = filteredInitialJobs.map((value) => value._id);

    // Get fields 
    const { keyword } = params;
    if (!keyword) {
        return jobsIds;
    }
    let keywordRegex = null;
    const query: any = {
        $and: [
            { _id: { $in: jobsIds } }
        ]
    };
    if (keyword) {
        keywordRegex = helper.getRegex(keyword, 'i');
        const customersIds = filteredInitialJobs.map((value) => value.customer).filter((value) => value !== undefined);
        const jobLocationsIds = filteredInitialJobs.map((value) => value.jobLocation).filter((value) => value !== undefined);
        const jobSitesIds = filteredInitialJobs.map((value) => value.jobSite).filter((value) => value !== undefined);
        const techniciansIds = filteredInitialJobs.flatMap((value) => value.tasks?.map((value: any) => value?.technician).filter((value: any) => value !== undefined))
        const contractorsIds = filteredInitialJobs.flatMap((value) => value.tasks?.map((value: any) => value?.contractor).filter((value: any) => value !== undefined))
        const [filteredCustomersIds, filteredJobLocationsIds, filteredJobSitesIds,
            filteredTechniciansIds, filteredContractorsIds] = await Promise.all([_getFilteredCustomerIds(customersIds, keywordRegex),
            _getFilteredJobLocationsIds(jobLocationsIds, keywordRegex), _getFilteredJobSitesIds(jobSitesIds, keywordRegex),
            _getFilteredTechniciansIds(techniciansIds, keywordRegex), _getFilteredContractorsIds(contractorsIds, keywordRegex)]);
        const queryOr: any = {
            $or: [
                { $text: { $search: keyword } },
                { customer: { $in: filteredCustomersIds } },
                { jobLocation: { $in: filteredJobLocationsIds } },
                { jobSite: { $in: filteredJobSitesIds } },
                { "tasks.technician": { $in: filteredTechniciansIds } },
                { "tasks.contractor": { $in: filteredContractorsIds } }
            ]
        };
        query['$and'].push(queryOr);
    }
    const values = (await Job.aggregate([
        { $match: query },
        {
            $project:
            {
                _id: 1
            },
        },
    ])).map((value: any) => value._id);
    return values;
}