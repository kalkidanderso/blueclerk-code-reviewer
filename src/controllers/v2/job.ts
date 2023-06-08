import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import * as helper from '../../services/helper';
import { Company } from '../../models/Company';
import { Job, IJob } from '../../models/Job';
import {
    splitArray, fillQueryCommon, getFilteredCustomerIds,
    getFilteredJobLocationsIds, getFilteredJobSitesIds, getFilteredTechniciansIds
} from './common';
import { DefaultPageSize, Status } from '../../common/constants';
import { IJobReport, JobReport } from '../../models/JobReport';

/**
 * Receives the request to get jobs
 * @param req request
 * @param res response
 * @returns {
 *       status,
 *       jobs,
 *       total
 *   }
 */
export const getJobs = async (req: Request, res: Response) => {

    const bodyParams = req.body;
    // Return error when all cursors are provided
    if (bodyParams.nextCursor && bodyParams.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }
    const queryParams = req.query;
    const companyId = req.otherCompanyId || req.companyId;
    const currentPage = bodyParams.currentPage || 0;
    const pageSize = bodyParams.pageSize || DefaultPageSize;
    // Data query that used to search Jobs
    const initialQuery: any = {
        $and: [{
            $or: [
                { 'tasks.contractor': companyId },
                { contractor: companyId },
                { company: companyId }
            ]
        }]
    };

    _fillInitialQueryJobs(bodyParams, queryParams, initialQuery);

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
    const parallelFilter = filteredInitialJobsSplited.map((value: any[]) => _getFilteredJobsIds(value, bodyParams));
    const finalJobsIds = (await Promise.all(parallelFilter)).flat()
    const finalQuery: any = {
        $and: [{ _id: { $in: finalJobsIds } }]
    }
    const finalParallelProcess = [Job.aggregate([
        { $match: finalQuery },
        {
            $count: "count"
        }
    ]),
    Job.aggregate([
        { $match: finalQuery },
        {
            $sort: { updatedAt: -1 }
        },
        { $skip: (currentPage * pageSize) },
        { $limit: pageSize },
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
    ])];

    const [total, jobs]: (any[] | IJob[]) = await Promise.all(finalParallelProcess);
    return res.json({
        status: Status.Success,
        jobs,
        total: total[0]?.count
    });
}

/**
 * Receives the request to get all job reports
 * @param req request
 * @param res response
 * @returns {
 *  status,
 *  reports,
 *  total,
 * }
 */
export const getAllJobReports = async (req: Request, res: Response) => {
    const params = req.query;
    // Return error when all cursors are provided
    if (params.nextCursor && params.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }
    const companyId = req.otherCompanyId || req.companyId;
    const currentPage = params.currentPage || 0;
    const pageSize = params.pageSize || DefaultPageSize;
    // Data query  used to search Job reports
    const initialQuery: any = {
        $and: [{
            $or: [
                { contractor: companyId },
                { company: companyId }
            ]
        }]
    };
    _fillInitialQueryJobReports(params, initialQuery);
    const filteredInitialJobReports = await JobReport.aggregate([
        { $match: initialQuery },
        {
            $project:
            {
                job: 1,
            },
        },
    ]);


    // Split the initial job reports into subarrays with 30,000 length, to do parallel processing
    const filteredInitialJobsSplited = splitArray(filteredInitialJobReports, 30000);
    const parallelFilter = filteredInitialJobsSplited.map((value: any[]) => _getFilteredJobReportsIds(value, params));
    const finalJobReportsIds = (await Promise.all(parallelFilter)).flat();

    const finalQuery: any = {
        $and: [{ _id: { $in: finalJobReportsIds } }]
    }
    const finalParallelProcess = [
        JobReport.aggregate([
            { $match: finalQuery },
            { $count: 'count' }
        ]),
        JobReport.aggregate([
            { $match: finalQuery },
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: (currentPage * pageSize) },
            { $limit: params.pageSize || DefaultPageSize },
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'job',
                    foreignField: '_id',
                    as: 'jobObj'
                }
            },
            {
                $lookup: {
                    from: 'invoices',
                    localField: 'invoice',
                    foreignField: '_id',
                    as: 'invoiceObj'
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'jobObj.customer',
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
                    from: 'joblocations',
                    localField: 'jobObj.jobLocation',
                    foreignField: '_id',
                    as: 'jobLocationObj',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                address: 1,
                            },
                        },
                    ],
                }
            },
            {
                $lookup: {
                    from: 'jobsites',
                    localField: 'jobObj.jobSite',
                    foreignField: '_id',
                    as: 'jobSiteObj'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'jobObj.tasks.technician',
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
                    localField: 'jobObj.tasks.contractor',
                    foreignField: '_id',
                    as: 'contractorsObj'
                }
            },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'company',
                    foreignField: '_id',
                    as: 'companyObj'
                }
            },
            {
                $lookup: {
                    from: 'jobtypes',
                    localField: 'jobObj.tasks.jobTypes.jobType',
                    foreignField: '_id',
                    as: 'jobTypeObj'
                }
            }
        ])
    ]
    const [total, jobReports]: (any[] | IJobReport[]) = await Promise.all(finalParallelProcess);
    return res.json({
        status: Status.Success,
        reports: jobReports,
        total: total[0]?.count,
    });
}


/**
 * ===================================
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */


/**
 * Check and add if params filter provided to initial jobs query
 * @param bodyParams params provided on the request body
 * @param queryParams param provided on the request query
 * @param query query to be filled
 */
const _fillInitialQueryJobs = (bodyParams: any, queryParams: any, query: any) => {
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

    if (customerId) {
        query['$and'].push({ customer: new ObjectId(customerId) });
    }

    if (startDate && endDate) {
        const startDateMoment = moment(startDate).format('YYYY-MM-DD');
        const endDateMoment = moment(endDate).format('YYYY-MM-DD');
        query['$and'].push({ scheduleDate: { $gte: new Date(startDateMoment), $lte: new Date(endDateMoment) } });
    }

    fillQueryCommon({ workType, companyLocation }, query['$and']);
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
 * Get the ids of filtered jobs
 * @param filteredInitialJobs the initial filtered jobs
 * @param params params received on the request to filter
 * @param jobSitesFieldsToFilter fields name used to filter on job sites by keyword
 * @param jobLocationsFieldsToFilter fields name used to filter on job locations by keyword
 * @returns Promise<ObjectId[]>
 */
const _getFilteredJobsIds = async (filteredInitialJobs: any[], params: any,
    jobSitesFieldsToFilter: string[] = ['name'], jobLocationsFieldsToFilter: string[] = ['name']): Promise<ObjectId[]> => {
    // Get the ids linked to the jobs and that they are on other collections
    const jobsIds = filteredInitialJobs.map((value) => value._id);

    // Get fields 
    const { keyword } = params;
    //early return
    if (!keyword) {
        return jobsIds;
    }
    const query: any = {
        $and: [
            { _id: { $in: jobsIds } }
        ]
    };
    const keywordRegex = helper.getRegex(keyword, 'i');
    const customersIds = filteredInitialJobs.map((value) => value.customer).filter((value) => value !== undefined);
    const jobLocationsIds = filteredInitialJobs.map((value) => value.jobLocation).filter((value) => value !== undefined);
    const jobSitesIds = filteredInitialJobs.map((value) => value.jobSite).filter((value) => value !== undefined);
    const techniciansIds = filteredInitialJobs.flatMap((value) => value.tasks?.map((value: any) => value?.technician).filter((value: any) => value !== undefined))
    const contractorsIds = filteredInitialJobs.flatMap((value) => value.tasks?.map((value: any) => value?.contractor).filter((value: any) => value !== undefined))
    const [filteredCustomersIds, filteredJobLocationsIds, filteredJobSitesIds,
        filteredTechniciansIds, filteredContractorsIds] = await Promise.all([getFilteredCustomerIds(customersIds, keywordRegex),
        getFilteredJobLocationsIds(jobLocationsIds, keywordRegex, jobLocationsFieldsToFilter),
        getFilteredJobSitesIds(jobSitesIds, keywordRegex, jobSitesFieldsToFilter),
        getFilteredTechniciansIds(techniciansIds, keywordRegex), _getFilteredContractorsIds(contractorsIds, keywordRegex)]);
    const queryOr: any = {
        $or: [
            { jobId: keywordRegex },
            { customer: { $in: filteredCustomersIds } },
            { jobLocation: { $in: filteredJobLocationsIds } },
            { jobSite: { $in: filteredJobSitesIds } },
            { "tasks.technician": { $in: filteredTechniciansIds } },
            { "tasks.contractor": { $in: filteredContractorsIds } }
        ]
    };
    query['$and'].push(queryOr);
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


/**
 * Check and add if params filter provided to initial jobs query
 * @param queryParams params provided on the request
 * @param query query to be filled
 */
const _fillInitialQueryJobReports = (queryParams: any, query: any) => {
    const { startDate, endDate } = queryParams;
    if (startDate && endDate) {
        const startDateMoment = moment(startDate).format('YYYY-MM-DD');
        const endDateMoment = moment(endDate).format('YYYY-MM-DD');
        query['$and'].push({ jobDate: { $gte: new Date(startDateMoment), $lte: new Date(endDateMoment) } });
    }
}

/**
 * Get the ids of filtered job reports
 * @param filteredInitialJobReports the initial filtered job reports
 * @param params params received on the request to filter
 * @param jobSitesFieldsToFilter fields name used to filter on job sites by keyword
 * @param jobLocationsFieldsToFilter fields name used to filter on job locations by keyword
 * @returns Promise<ObjectId[]>
 */
const _getFilteredJobReportsIds = async (filteredInitialJobReports: any[], params: any): Promise<ObjectId[]> => {
    // Get the ids linked to the jobs and that they are on other collections
    const jobReportsIds = filteredInitialJobReports.map((value) => value._id);
    // Get fields 
    const { keyword, workType, companyLocation } = params;
    //early return
    if (!keyword) {
        return jobReportsIds;
    }
    //Additional filter by params receive, workType and companyLocation on the jobs
    const jobsQueryParams: any[] = [];
    fillQueryCommon({ workType, companyLocation }, jobsQueryParams);
    const jobsIds = filteredInitialJobReports.map((value) => value.job);
    const jobsQuery: any = { $and: [{ _id: { $in: jobsIds } }] };
    if (jobsQueryParams.length > 0) {
        jobsQuery['$and'].push(...jobsQueryParams);
    }
    const jobs = await Job.aggregate([
        { $match: jobsQuery },
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
    const jobSitesFieldsToFilter: string[] = ['name', 'address.street', 'address.city'];
    const jobLocationsFieldsToFilter: string[] = ['name', 'address.street', 'address.city'];

    const filteredJobs = await _getFilteredJobsIds(jobs, params, jobSitesFieldsToFilter,
        jobLocationsFieldsToFilter);

    const keywordRegex = helper.getRegex(keyword, 'i');

    const query: any = {
        $and: [
            { _id: { $in: jobReportsIds } },
            {
                $or: [
                    { customerName: keywordRegex },
                    { technicianName: keywordRegex },
                    { job: { $in: filteredJobs } }
                ]
            }
        ]
    };
    //Forcing to match witht he jobs if they need to be filtered by workType or companyLocation
    if (jobsQueryParams.length > 0) {
        query['$and'].push({ job: jobs.map((value) => value._id) })
    }
    const values = (await JobReport.aggregate([
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