import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import * as helper from '../../services/helper';
import { Company, ICompany } from '../../models/Company';
import { Job, IJob, TaskEntry, ITask } from '../../models/Job';
import {
    splitArray,
    fillQueryCommon,
    getFilteredCustomerIds,
    getFilteredJobLocationsIds,
    getFilteredJobSitesIds,
    getFilteredTechniciansIds,
} from './common';
import { DefaultPageSize, JobStatus, Status } from '../../common/constants';
import { IJobReport, JobReport } from '../../models/JobReport';
import * as Sentry from '@sentry/node';
import { IUser } from '../../models/User';
import { Item } from '../../models/Item';
import { JobCommission } from '../../models/JobCommission';
import { ServiceTicket } from '../../models/ServiceTicket';
import { createJobReport, handleMutltipleTechniciansTasks } from '../job';
import { Invoice } from '../../models/Invoice';
import { HomeOwner } from '../../models/HomeOwner';

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
    const queryParams = req.query;
    const companyId = req.otherCompanyId || req.companyId;
    const currentPage = bodyParams.currentPage || 0;
    const pageSize = bodyParams.pageSize || DefaultPageSize;
    // Data query that used to search Jobs
    const initialQuery: any = {
        $and: [
            {
                $or: [{ 'tasks.contractor': companyId }, { contractor: companyId }, { company: companyId }],
            },
        ],
    };

    _fillInitialQueryJobs(bodyParams, queryParams, initialQuery);

    const filteredInitialJobs = await Job.aggregate([
        { $match: initialQuery },
        {
            $project: {
                customer: 1,
                jobLocation: 1,
                jobSite: 1,
                'tasks.technician': 1,
                'tasks.contractor': 1,
            },
        },
    ]);

    // Split the initial jobs into subarrays with 30,000 length, to do parallel processing
    const filteredInitialJobsSplited = splitArray(filteredInitialJobs, 30000);
    const parallelFilter = filteredInitialJobsSplited.map((value: any[]) => _getFilteredJobsIds(value, bodyParams));
    const finalJobsIds = (await Promise.all(parallelFilter)).flat();
    const finalQuery: any = {
        $and: [{ _id: { $in: finalJobsIds } }],
    };
    const finalParallelProcess = [
        Job.aggregate([
            { $match: finalQuery },
            {
                $count: 'count',
            },
        ]),
        Job.aggregate([
            { $match: finalQuery },
            {
                $sort: { updatedAt: -1 },
            },
            { $skip: currentPage * pageSize },
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
                                contactName: 1,
                                notes: 1,
                                isPORequired: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'servicetickets',
                    localField: 'ticket',
                    foreignField: '_id',
                    as: 'ticketObj',
                },
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
                },
            },
            {
                $lookup: {
                    from: 'jobsites',
                    localField: 'jobSite',
                    foreignField: '_id',
                    as: 'jobSiteObj',
                },
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
                },
            },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'tasks.contractor',
                    foreignField: '_id',
                    as: 'contractorsObj',
                },
            },
            {
                $lookup: {
                    from: 'homeowners',
                    localField: 'homeOwner',
                    foreignField: '_id',
                    as: 'homeOwnerObj',
                },
            },
            {
                $lookup: {
                    from: 'jobtypes',
                    localField: 'tasks.jobTypes.jobType',
                    foreignField: '_id',
                    as: 'jobTypeObj',
                },
            },
            {
                $project: {
                    _id: 1,
                    jobId: 1,
                    images: 1,
                    technicianImages: 1,
                    status: '$status',
                    isHomeOccupied: '$isHomeOccupied',
                    createdBy: '$createdBy',
                    description: '$description',
                    tasks: '$tasks',
                    track: '$track',
                    customerObj: '$customerObj',
                    homeOwnerObj: '$homeOwnerObj',
                    jobLocationObj: '$jobLocationObj',
                    jobSiteObj: '$jobSiteObj',
                    scheduledStartTime: '$scheduledStartTime',
                    scheduledEndTime: '$scheduledEndTime',
                    technicianObj: '$technicianObj',
                    contractorsObj: '$contractorsObj',
                    jobTypeObj: '$jobTypeObj',
                    ticketObj: '$ticketObj',
                    scheduleDate: '$scheduleDate',
                    scheduleTimeAMPM: '$scheduleTimeAMPM',
                    customerContactId: '$customerContactId',
                },
            },
        ]),
    ];

    const [total, jobs]: any[] | IJob[] = await Promise.all(finalParallelProcess);
    return res.json({
        status: Status.Success,
        jobs,
        total: total[0]?.count,
    });
};

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
    const companyId = req.otherCompanyId || req.companyId;
    const currentPage = params.currentPage || 0;
    const pageSize = params.pageSize || DefaultPageSize;
    // Data query  used to search Job reports
    const initialQuery: any = {
        $and: [
            {
                $or: [{ contractor: companyId }, { company: companyId }],
            },
        ],
    };
    _fillInitialQueryJobReports(params, initialQuery);
    const filteredInitialJobReports = await JobReport.aggregate([
        { $match: initialQuery },
        {
            $project: {
                job: 1,
            },
        },
    ]);

    // Split the initial job reports into subarrays with 30,000 length, to do parallel processing
    const filteredInitialJobsSplited = splitArray(filteredInitialJobReports, 30000);
    const parallelFilter = filteredInitialJobsSplited.map((value: any[]) => _getFilteredJobReportsIds(value, params));
    const finalJobReportsIds = (await Promise.all(parallelFilter)).flat();

    const finalQuery: any = {
        $and: [{ _id: { $in: finalJobReportsIds } }],
    };
    const finalParallelProcess = [
        JobReport.aggregate([{ $match: finalQuery }, { $count: 'count' }]),
        JobReport.aggregate([
            { $match: finalQuery },
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: currentPage * pageSize },
            { $limit: params.pageSize || DefaultPageSize },
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'job',
                    foreignField: '_id',
                    as: 'jobObj',
                },
            },
            {
                $lookup: {
                    from: 'invoices',
                    localField: 'invoice',
                    foreignField: '_id',
                    as: 'invoiceObj',
                },
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
                },
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
                },
            },
            {
                $lookup: {
                    from: 'jobsites',
                    localField: 'jobObj.jobSite',
                    foreignField: '_id',
                    as: 'jobSiteObj',
                },
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
                },
            },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'jobObj.tasks.contractor',
                    foreignField: '_id',
                    as: 'contractorsObj',
                },
            },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'company',
                    foreignField: '_id',
                    as: 'companyObj',
                },
            },
            {
                $lookup: {
                    from: 'jobtypes',
                    localField: 'jobObj.tasks.jobTypes.jobType',
                    foreignField: '_id',
                    as: 'jobTypeObj',
                },
            },
        ]),
    ];
    const [total, jobReports]: any[] | IJobReport[] = await Promise.all(finalParallelProcess);
    return res.json({
        status: Status.Success,
        reports: jobReports,
        total: total[0]?.count,
    });
};

/**
 * Receives the request to update partially job
 * @param req request
 * @param res response
 * @returns {
 *  status,
 *  message,
 *  job,
 * }
 */
export const updatePartialJob = async (req: Request, res: Response, sio: any) => {
    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    Job.findOne({ _id: params.jobId })
        .populate({
            path: 'tasks.contractor',
        })
        .populate({
            path: 'ticket',
        })
        .populate({
            path: 'customer',
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile.displayName',
        })
        .populate({
            path: 'tasks.jobTypes.jobType',
        })
        .then(async (job: IJob) => {
            let action = '';
            let ticketAction = '';

            const track = job.track ? job.track : [];

            let needUpdate = false;
            const newJobTypes: any = [];
            //Update Completed Count when job is completed
            if (params.isCompletedJob) {
                const newTasks = JSON.parse(params.newJobTasks);
                if (newTasks) {
                    job.tasks.forEach((task) => {
                        const newTask = newTasks.find((res: any) => res._id == task._id);

                        const allJobTypeStatus: any = [];
                        task.jobTypes.forEach((jobType) => {
                            const newJobType = newTask?.jobTypes?.find((res: any) => res._id == jobType._id);
                            if (newJobType) {
                                jobType.jobCostingQuantity = newJobType.completedCount;
                                jobType.completedCount = newJobType.completedCount;

                                if ((jobType.completedCount ?? jobType.quantity) < jobType.quantity) {
                                    jobType.status = JobStatus.PARTIALLY_COMPLETED;
                                    needUpdate = true;
                                }
                            }
                            newJobTypes.unshift(jobType);
                            allJobTypeStatus.push(jobType.status);
                        });

                        if (allJobTypeStatus.every((status: JobStatus) => status === JobStatus.FINISHED)) {
                            // All new job type task are FINISHED, Job is FINISHED
                            task.status = JobStatus.FINISHED;
                        }
                    });
                }
                if (needUpdate) {
                    job.commission = await _calculateJobCommission(job.tasks, job._id);
                }
            } else {
                needUpdate = true;
            }

            if (!needUpdate) {
                return res.json({ status: Status.Success, message: 'Job rescheduled successfully.' });
            }

            switch (params.action) {
                case 'close-job':
                    job.status = JobStatus.FINISHED;

                    //Commission Calculation
                    job.commission = await _calculateJobCommission(job.tasks, job._id);

                    action = '|Finishing the job|';
                    ticketAction = `|Job finished by ${user.profile.displayName}|`;
                    break;
                case 'create-new-ticket':
                case 'create-new-po-request':
                    await _splitJobAndCreateTicket(job);

                    action = `|Closed Job and Created New ${params.type}|`;
                    ticketAction = `|Closeed Job and Created New ${params.type} by ${user.profile.displayName}|`;
                    break;
                case 'reschedule':
                    await _splitJobAndReschedule(req, res, job);

                    action = '|Reacheduled Job|';
                    ticketAction = `|Rescheduled Job by ${user.profile.displayName}|`;
                    break;
                default:
                    break;
            }

            if (action) {
                track.push({
                    user: user._id,
                    action,
                    date: new Date(),
                });
            }
            try {
                //Save Job Update
                await job.save();

                if (job?.ticket && ticketAction) {
                    const serviceTicket = await ServiceTicket.findById(job.ticket);
                    serviceTicket.track.push({
                        user: user._id,
                        action: ticketAction,
                        date: new Date(),
                    });

                    await serviceTicket.save();
                }

                const customerName = job.customer
                    ? job.customer.profile?.displayName
                    : job.ticket
                      ? job.ticket.customer
                          ? job.ticket.customer?.profile?.displayName
                          : null
                      : null;

                const date = job.scheduleDate;
                let technicianName = null;
                if (job.tasks.length > 1) {
                    technicianName = 'Multiple Techs';
                } else {
                    technicianName = job.tasks[0].technician.profile.displayName;
                }

                await createJobReport(job._id, job.company, customerName, technicianName, date, company._id);
                return res.json({ status: Status.Success, message: 'Job rescheduled successfully.', job: job });
            } catch (err) {
                Sentry.captureException(err);
                return res.json({ status: Status.Error, message: err.message });
            }
        })
        .catch((err) => {
            Sentry.captureException(err);
            return res.json({ status: Status.Error, message: err.message });
        });
};

/**
 * Receives the request to get job invoice
 * @param req request
 * @param res response
 * @returns {
 *  status,
 *  invoice,
 * }
 */
export const getJobInvoice = async (req: Request, res: Response, sio: any) => {
    const { jobId } = req.params;
    const invoice = await Invoice.findOne({ job: jobId });

    return res.json({
        status: Status.Success,
        invoice,
    });
};

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
    const { technicianIds, status, startDate, endDate, customerId } = bodyParams;
    const { workType, companyLocation } = queryParams;

    let technicianIdsToFilter: any[];

    if (technicianIds) {
        // Validate is technician ids is already array or object
        technicianIdsToFilter = Array.isArray(technicianIds) ? technicianIds : technicianIds.split(',');
    }
    if (technicianIdsToFilter?.length > 0) {
        // convert technician Id from string to objectId and remove falsy value
        const technicians = technicianIdsToFilter.map((technicianId) => {
            if (ObjectId.isValid(technicianId)) return new ObjectId(technicianId);
        });
        query['$and'].push({
            $or: [{ 'tasks.technician': { $in: technicians } }, { 'tasks.contractor': { $in: technicians } }],
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
};

/**
 * Get contractors/companies ids filtered by ids and keyword
 * @param contractorsIds ids to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise <ObjectId[]>
 */
const _getFilteredContractorsIds = async (contractorsIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    //early return
    if (!keywordRegex) {
        return contractorsIds;
    }
    const query: any = {
        $and: [
            {
                _id: {
                    $in: contractorsIds,
                },
            },
        ],
    };
    query['$and'].push({
        'info.companyName': keywordRegex,
    });
    const filteredContractorsIds = (
        await Company.aggregate([
            {
                $match: query,
            },
            {
                $project: {
                    _id: 1,
                },
            },
        ])
    ).map((value) => value._id);
    return filteredContractorsIds;
};

/**
 * Get the ids of filtered jobs
 * @param filteredInitialJobs the initial filtered jobs
 * @param params params received on the request to filter
 * @param jobSitesFieldsToFilter fields name used to filter on job sites by keyword
 * @param jobLocationsFieldsToFilter fields name used to filter on job locations by keyword
 * @returns Promise<ObjectId[]>
 */
const _getFilteredJobsIds = async (
    filteredInitialJobs: any[],
    params: any,
    jobSitesFieldsToFilter: string[] = ['name'],
    jobLocationsFieldsToFilter: string[] = ['name'],
): Promise<ObjectId[]> => {
    // Get the ids linked to the jobs and that they are on other collections
    const jobsIds = filteredInitialJobs.map((value) => value._id);

    // Get fields
    const { keyword } = params;
    //early return
    if (!keyword) {
        return jobsIds;
    }
    const query: any = {
        $and: [{ _id: { $in: jobsIds } }],
    };
    const keywordRegex = helper.getRegex(keyword, 'i');
    const customersIds = filteredInitialJobs.map((value) => value.customer).filter((value) => value !== undefined);
    const jobLocationsIds = filteredInitialJobs
        .map((value) => value.jobLocation)
        .filter((value) => value !== undefined);
    const jobSitesIds = filteredInitialJobs.map((value) => value.jobSite).filter((value) => value !== undefined);
    const techniciansIds = filteredInitialJobs.flatMap((value) =>
        value.tasks?.map((value: any) => value?.technician).filter((value: any) => value !== undefined),
    );
    const contractorsIds = filteredInitialJobs.flatMap((value) =>
        value.tasks?.map((value: any) => value?.contractor).filter((value: any) => value !== undefined),
    );
    const [
        filteredCustomersIds,
        filteredJobLocationsIds,
        filteredJobSitesIds,
        filteredTechniciansIds,
        filteredContractorsIds,
    ] = await Promise.all([
        getFilteredCustomerIds(customersIds, keywordRegex),
        getFilteredJobLocationsIds(jobLocationsIds, keywordRegex, jobLocationsFieldsToFilter),
        getFilteredJobSitesIds(jobSitesIds, keywordRegex, jobSitesFieldsToFilter),
        getFilteredTechniciansIds(techniciansIds, keywordRegex),
        _getFilteredContractorsIds(contractorsIds, keywordRegex),
    ]);
    const queryOr: any = {
        $or: [
            { jobId: keywordRegex },
            { customer: { $in: filteredCustomersIds } },
            { jobLocation: { $in: filteredJobLocationsIds } },
            { jobSite: { $in: filteredJobSitesIds } },
            { 'tasks.technician': { $in: filteredTechniciansIds } },
            { 'tasks.contractor': { $in: filteredContractorsIds } },
        ],
    };
    query['$and'].push(queryOr);
    const values = (
        await Job.aggregate([
            { $match: query },
            {
                $project: {
                    _id: 1,
                },
            },
        ])
    ).map((value: any) => value._id);
    return values;
};

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
};

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
    if (!keyword && !workType && !companyLocation) {
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
            $project: {
                customer: 1,
                jobLocation: 1,
                jobSite: 1,
                'tasks.technician': 1,
                'tasks.contractor': 1,
            },
        },
    ]);

    const query: any = {
        $and: [{ _id: { $in: jobReportsIds } }],
    };
    //conditioning the search with keyword
    if (keyword) {
        const jobSitesFieldsToFilter: string[] = ['name', 'address.street', 'address.city'];
        const jobLocationsFieldsToFilter: string[] = ['name', 'address.street', 'address.city'];

        const filteredJobs = await _getFilteredJobsIds(
            jobs,
            params,
            jobSitesFieldsToFilter,
            jobLocationsFieldsToFilter,
        );

        const keywordRegex = helper.getRegex(keyword, 'i');
        query['$and'].push({
            $or: [{ customerName: keywordRegex }, { technicianName: keywordRegex }, { job: { $in: filteredJobs } }],
        });
    }
    //Forcing to match witht he jobs if they need to be filtered by workType or companyLocation
    if (jobsQueryParams.length > 0) {
        query['$and'].push({ job: { $in: jobs.map((value) => value._id) } });
    }
    const values = (
        await JobReport.aggregate([
            { $match: query },
            {
                $project: {
                    _id: 1,
                },
            },
        ])
    ).map((value: any) => value._id);
    return values;
};

/**
 * Calculate technician job commission.
 * @param tasks tasks from job details to retrieve all quantity and tier.
 * @param jobId Job ID from job details to be used as an identifier when inserting into the job commission database.
 * @returns commissionId
 */
const _calculateJobCommission = async (tasks: any, jobId: string) => {
    let commissionId = null;
    const invoiceCommissionEntry: any[] = [];

    for (const task of tasks) {
        task.status = JobStatus.FINISHED;
        const contractorCommissionEntry = {
            contractor: task.contractor?._id,
            technician: task.contractor?.admin,
            commission: 0,
            commissionAmount: 0,
        };

        const contractor = task.contractor as ICompany;
        if (contractor && contractor.commissionType == 'fixed') {
            for (const j of task.jobTypes) {
                let balance = 0;

                const jobType = await Item.findOne({ jobType: j.jobType });
                const commissionTierId = contractor.commissionTier;
                if (commissionTierId) {
                    const commissionTier = jobType.costing.find(({ tier }) => String(tier) == String(commissionTierId));
                    if (commissionTier?.charge) {
                        balance += commissionTier.charge * (j.completedCount ?? (j.quantity || 1));
                        contractorCommissionEntry.commission +=
                            commissionTier.charge * (j.completedCount ?? (j.quantity || 1));
                        contractorCommissionEntry.commissionAmount +=
                            commissionTier.charge * (j.completedCount ?? (j.quantity || 1));
                    }
                }
                await Company.findByIdAndUpdate(contractor?._id, { $inc: { balance } }, { new: true }).exec();
            }
            invoiceCommissionEntry.push(contractorCommissionEntry);
        }
    }

    if (invoiceCommissionEntry.length) {
        const jobCommisssion = await new JobCommission({
            job: jobId,
            technicians: invoiceCommissionEntry,
        }).save();
        commissionId = jobCommisssion;
    }
    return commissionId;
};

/**
 * Split a partially completed job to create a new ticket from it
 * @param req request
 * @param res response
 * @param job Job details used to retrieve task details.
 * @returns {
 *      newTicket
 * }
 */
const _splitJobAndCreateTicket = async (job: IJob) => {
    const ticketJobTypes: any = [];

    let isJobHaveItems = false;
    job.tasks.forEach((task) => {
        const newJobTypes: any = [];
        task.jobTypes.forEach((jobType) => {
            if ((jobType.completedCount || 0) < jobType.quantity && jobType.status == 7) {
                //Split Quantity
                ticketJobTypes.push({
                    quantity: jobType.quantity - jobType.completedCount,
                    jobType: jobType.jobType,
                    price: jobType.price,
                });

                if (jobType.completedCount) {
                    jobType.quantity = jobType.completedCount;
                    jobType.status = JobStatus.FINISHED;

                    newJobTypes.push(jobType);
                }
            } else {
                newJobTypes.push(jobType);
            }
        });

        task.jobTypes = newJobTypes;
        if (newJobTypes.length) {
            isJobHaveItems = true;
            task.status = JobStatus.FINISHED;
        } else {
            task.status = JobStatus.CANCELED;
        }
    });

    if (isJobHaveItems) {
        //Chnges Job Status to be Completed
        job.status = JobStatus.FINISHED;
    } else {
        //Chnges Job Status to be Canceled
        job.status = JobStatus.CANCELED;
    }

    //Commission Calculation
    job.commission = await _calculateJobCommission(job.tasks, job._id);
};

/**
 * Split a partially completed job and reschedule the job
 * @param req request
 * @param res response
 * @param job Job details used to retrieve task details.
 */
const _splitJobAndReschedule = async (req: Request, res: Response, job: IJob) => {
    const params = req.body;
    const user = <IUser>req.user;

    const imagesUrl: string[] = [];
    if (req.files) {
        const paramsImageFile = JSON.parse(JSON.stringify(req.files));

        // Push image location from req.files to imagesUrl
        paramsImageFile?.image?.forEach((image: any) => imagesUrl.push(image.location));
        paramsImageFile?.images?.forEach((image: any) => imagesUrl.push(image.location));
    }

    let tasks: any = [];
    let paramTasks: TaskEntry[] = params.tasks ?? [];
    // To handle any over-stringified strings
    if (!Array.isArray(paramTasks)) {
        paramTasks = JSON.parse(params.tasks);
    }
    try {
        tasks = await handleMutltipleTechniciansTasks({
            req,
            res,
            parentJob: undefined,
            paramTasks,
            serviceTicket: job.ticket,
        });
    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: error.message });
    }

    job.tasks.forEach((task) => {
        let newJobTypes: any = [];
        task.jobTypes.forEach((jobType) => {
            if ((jobType.completedCount || 0) < jobType.quantity && jobType.status == 7) {
                if (jobType.completedCount) {
                    jobType.quantity = jobType.completedCount;
                    jobType.status = JobStatus.FINISHED;

                    newJobTypes.push(jobType);
                }
            } else {
                newJobTypes.push(jobType);
            }
        });
        task.status = JobStatus.FINISHED;

        tasks.forEach((newTask: any, index: number) => {
            if (newTask.technician.toString() == task.technician?._id.toString()) {
                newJobTypes = newJobTypes.concat(newTask.jobTypes);
                task.status = JobStatus.PENDING;

                tasks.splice(index, 1);
            }
        });

        task.jobTypes = newJobTypes;
    });

    job.tasks = job.tasks.concat(tasks);
    job.scheduleDate = params.scheduleDate;
    job.description = params.description;

    let newStartTime: any = null;
    let newEndTime: any = null;
    let date;
    if (params.scheduledStartTime) {
        date = new Date(params.scheduleDate);
        newStartTime = new Date(params.scheduledStartTime);
        job.scheduledStartTime = newStartTime;
    }

    if (params.scheduledEndTime) {
        date = new Date(params.scheduleDate);
        newEndTime = new Date(params.scheduledEndTime);
        job.scheduledEndTime = newEndTime;
    }

    if (params.equipmentId != undefined && params.equipmentId !== '""') {
        job.equipmentId = params.equipmentId;
    }

    if (params.jobLocationId) {
        job.jobLocation = params.jobLocationId;
    }

    if (params.jobSiteId) {
        job.jobSite = params.jobSiteId;
    }

    if (params.homeJobLocationId) {
        job.homeJobLocation = params.homeJobLocationId;
    }

    if (params.homeJobSiteId) {
        job.homeJobSite = params.homeJobSiteId;
    }

    if (params.isHomeOccupied || params.isHomeOccupied === false || params.isHomeOccupied === true) {
        job.isHomeOccupied = params.isHomeOccupied;
    }

    if (params.isHomeOccupied === true) {
        if (params.homeOwnerId && params.homeOwnerId !== job.homeOwner) {
            const newHomeOwner = await HomeOwner.findOne({ _id: params.homeOwnerId });
            if (!newHomeOwner) {
                return res.json({
                    status: Status.NotFound,
                    message: 'Provided homeOwnerId does not correspond with any home owner',
                });
            }
            job.homeOwner = params.homeOwnerId;
        } else {
            if (params.isHomeOccupied === true && !job.homeOwner) {
                return res.json({ status: Status.Error, message: 'Home Owner is required when home is occupied' });
            }
        }
    } else if (params.isHomeOccupied === false) {
        job.homeOwner = null;
    }

    if (params.customerContactId) {
        job.customerContactId = params.customerContactId;
    }

    if (params.customerPO) {
        job.customerPO = params.customerPO;
    }

    if (imagesUrl?.length) {
        imagesUrl.forEach((imageUrl) => {
            job.images.push({ imageUrl, uploadedBy: user.id, createdAt: new Date() });
        });
    }

    if (params.scheduleTimeAMPM) {
        job.scheduleTimeAMPM = params.scheduleTimeAMPM;
    }

    job.rescheduled = true;
    job.status = JobStatus.PENDING;
};
