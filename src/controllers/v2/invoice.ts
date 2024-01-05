import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import * as helper from '../../services/helper';
import { DefaultPageSize, Status } from '../../common/constants';
import { IInvoice, Invoice } from '../../models/Invoice';

import { _checkQBCustomerJobLocation } from '../quickbook.customer';
import { _createQBInvoice, _deleteQBInvoice, _updateQBInvoice, _voidQBInvoice } from '../quickbook.invoice';
import { Job } from '../../models/Job';
import { JobLocation } from '../../models/JobLocation';
import { JobSite } from '../../models/JobSite';
import { Company } from '../../models/Company';
import { Customer } from '../../models/Customer';
import { splitArray } from './common';
import { User } from '../../models/User';
import { param } from 'express-validator';
import XLSX from "xlsx-js-style";

/**
 * Receives the request to get invoices
 * @param req request
 * @param res response
 * @returns {
 *       status,
 *       total,
 *       unsyncedInvoices,
 *       invoices,
 *       pagination: {
 *           nextCursor,
 *           previousCursor,
 *           pageSize
 *       }
 * }
 */
export const getInvoices = async (req: Request, res: Response) => {

    const params = req.body;
    const queryParams = req.query;
    let companyId = req.otherCompanyId || req.companyId;
    let currentPage = params.currentPage || 0;
    let pageSize = params.pageSize || DefaultPageSize;
    // Check if any filter provided to decide whether return all records or not
    let isAllRecords = await _getIsAllRecordsByParams(params);
    // Get the date of the last 90 days
    const last90days = moment().subtract(90, 'days').format();

    // Return error when all cursors are provided
    if (params.nextCursor && params.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }

    // Data query that used to search Invoices and available previous/next page
    const initialQuery: any = {
        $and: [{ company: companyId }]
    };

    // Add the last 90 days filter if need to return all records
    if (!isAllRecords) {
        initialQuery['$and'].push({ issuedDate: { $gte: new Date(last90days) } });
    }
    // Add filters to initial query
    _fillInitialQuery(params, queryParams, initialQuery);

    const filteredInitialInvoices = await Invoice.aggregate([
        { $match: initialQuery },
        {
            $project:
            {
                job: 1,
                customer: 1,
            },
        },
    ]);

    // Split the initial invoices into subarrays with 30,000 length, to do parallel processing
    const filteredInitialInvoicesSplited = splitArray(filteredInitialInvoices, 30000);
    const parallelFilter = filteredInitialInvoicesSplited.map((value: any[]) => _getFinalInvoicesIds(value, params));
    const finalInvoicesIds = (await Promise.all(parallelFilter)).flat()

    const finalQuery: any = {
        $and: [
            { _id: { $in: finalInvoicesIds } }
        ]
    };

    // Deep clone filter finalQuery
    const query: any = { $and: [] };
    finalQuery['$and'].map((q: any) => { query['$and'].push({ ...q }) });

    // Sort query that default to sort by the recent ones
    let sortQuery = { createdAt: -1, _id: -1 };

    // Get the invoices limiting by the page size
    let invoices = await Invoice.aggregate(
        [
            {
                $match: { ...query }
            },
            {
                $sort: sortQuery
            },
            { $skip: (currentPage * pageSize) },
            { $limit: params.pageSize || DefaultPageSize },
        ]
    )

    // Parallel processing ond fifferent queries that can be executed in parallel
    const parallelProcessing = [
        // Populate the invoices from aggregate
        Invoice.populate(invoices, [
            { path: 'job', select: 'jobId scheduleDate ticket jobLocation jobSite tasks', populate: [{ path: 'jobLocation', select: 'name address location' }, { path: 'jobSite', select: 'name address location' }] },
            { path: 'paymentTerm', select: 'name dueDays' },
            { path: 'customer', select: 'info.email auth.email profile address contact vendorId contactName contactEmail' },
            { path: 'customerContactId', select: 'name phone email' },
            { path: 'jobLocation', select: 'name address location' },
            { path: 'jobSite', select: 'name address location' },
            { path: 'companyLocation', select: 'billingAddress name isMainLocation' },
            { path: 'workType', select: 'title' },
        ]),
        //count
        Invoice.aggregate([
            { $match: { ...finalQuery } },
            { $count: 'count' },

        ]),

        // Retrieve number of the unsynced invoices
        Invoice.find({
            company: companyId,
            isDraft: { $ne: true },
            // allow void invoices
            // isVoid: { $ne: true },
            quickbookId: null
        }).countDocuments()
    ];

    const [, allInvoices, unsyncedInvoices]: (IInvoice[] | any[] | any)[] = await Promise.all(parallelProcessing)

    return res.json({
        status: Status.Success,
        total: allInvoices[0]?.count,
        unsyncedInvoices,
        invoices
    })
}

/**
 * Export invoices to excel 
 * @param req request
 * @param res response 
 * @returns excel files
 */
export const exportInvoicesToExcel = async (req: Request, res: Response) => {
    const invoices = await _getDataInvoices(req, res) as any[];
    const rows = invoices.map((invoice: any) => _converInvoiceToRowExcel(invoice));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows, { cellStyles: true });
    const headers = ["Payment Status", "Invoice ID", "Invoice Date", "Customer", "Subdivision", "Job Address", "PO", "Total", "Email Send Date", "Contact Name", "Contact Email"]
    const columnWidths = [{ wch: 14.17 }, { wch: 11.58 }, { wch: 12.17 }, { wch: 14.17 }, { wch: 14.38 }, { wch: 14.38 }, { wch: 8.38 }, { wch: 14.17 }, { wch: 12.17 }, { wch: 14.17 }, { wch: 14.17 }];
    worksheet['!cols'] = columnWidths;
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

    const cellStyles: any = {
        PAID: {
            font: { color: { rgb: "00B04E" }}
        },
        UNPAID: {
            font: { color: { rgb: "FF0000" }}
        },
        PARTIALLY_PAID: {
            font: { color: { rgb: "FA8029" }}
        },
    };

    // Set the style for each cell in column A (Status) based on its value
    for (let rowIndex = 0; rowIndex <= rows.length; rowIndex++) {
        const cellRefStatus = XLSX.utils.encode_cell({ c: 0, r: rowIndex });
        let cellStatus = worksheet[cellRefStatus];
        if (cellStatus && cellStatus.v in cellStyles) {
            const cellStyle = cellStyles[cellStatus.v];
            if (cellStyles) {
                cellStatus["s"] = cellStyle;
            }
        }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });


    res.attachment(`invoices-${moment().format("YYYYMMDD")}.xlsx`);
    res.header('Access-Control-Expose-Headers', 'Content-Type, Location, Content-Disposition');
    res.status(200).end(buf);
}

/**
 * ===================================
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */


// PARTIAL METHODS

/**
 * Check and add if params filter provided to initial query
 * @param params params provided on the request
 * @param queryParams query params provided on the request
 * @param query query to be filled
 */
const _fillInitialQuery = (params: any, queryParams: any, query: any) => {
    const { invoiceId, dueDate, status, startAmount, endAmount, customerPO, missingPO,
        customerId, customerContactId, isDraft, isVoid, startDate, endDate,
        lastEmailStartDate, lastEmailEndDate, bouncedEmailFlag } = params;
    const { workType, companyLocation } = queryParams;
    if (invoiceId) {
        const invoiceIdRegex = helper.getRegex(invoiceId, 'i');
        query['$and'].push({ invoiceId: invoiceIdRegex });
    }
    if (dueDate) {
        const dueDateMoment = moment(dueDate).endOf('day').format();
        query['$and'].push({ dueDate: { $lte: new Date(dueDateMoment) } });
    }
    if (status) {
        query['$and'].push({ status: { $in: JSON.parse(status) } });
    }
    if (startAmount) {
        query['$and'].push({ total: { $gte: startAmount } });
    }
    if (endAmount) {
        query['$and'].push({ total: { $lte: endAmount } });
    }
    if (customerPO) {
        const customerPORegex = helper.getRegex(customerPO, 'i');
        query['$and'].push({ customerPO: customerPORegex });
    }
    if (missingPO) {
        query['$and'].push({ $or: [{ customerPO: { $exists: false } }, { customerPO: '' }, { customerPO: null }] });
    }
    if (bouncedEmailFlag) {
        query['$and'].push({ bouncedEmailFlag: true });
    }
    if (customerId) {
        query['$and'].push({ customer: new ObjectId(customerId) });
    }
    if (customerContactId) {
        query['$and'].push({ customerContactId: new ObjectId(customerContactId) });
    }

    switch (isVoid) {
        case true:
            query['$and'].push({ isVoid: isVoid });
            break;
        case false:
            query['$and'].push({ isVoid: { $ne: true } });
            break;
        default:
            /**
             * For isVoid false, use the $ne because we want to retrieve old invoices,
             * old invoices may don't have isVoid property at all
             */
            // query['$and'].push({ isVoid: { $ne: true } });
            break;
    }
    switch (isDraft) {
        case true:
            query['$and'].push({ isDraft: isDraft });
            break;

        default:
            /**
             * For isDraft false, use the $ne because we want to retrieve old invoices,
             * old invoices may don't have isDraft property at all
             */
            query['$and'].push({ isDraft: { $ne: true } });
            break;
    }
    if (startDate && endDate) {
        const startDateMoment = moment.utc(startDate).startOf('day').format();
        const endDateMoment = moment.utc(endDate).endOf('day').format();
        query['$and'].push({ issuedDate: { $gte: new Date(startDateMoment), $lte: new Date(endDateMoment) } });
    }
    if (lastEmailStartDate && lastEmailEndDate) {
        const lastEmailStartDateMoment = moment(lastEmailStartDate).startOf('day').format();
        const lastEmailEndDateMoment = moment(lastEmailEndDate).endOf('day').format();
        query['$and'].push({ lastEmailSent: { $gte: new Date(lastEmailStartDateMoment), $lte: new Date(lastEmailEndDateMoment) } });
    }
    if (workType) {
        let workTypeIds: any[] = [];
        try {
            let workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            })
        } catch (error) { };
        query['$and'].push({ workType: { $in: workTypeIds } });
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            let companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            })
        } catch (error) { }
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
    if (keywordRegex) {
        query['$and'].push({ "profile.displayName": keywordRegex })
    }
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
 * Get the jobs ids linked to the invoices filtered by ids, additional params
 * and keyword
 * @param jobsIds jobs ids to be filtered
 * @param params contains the params to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const _getFilteredJobsIds = async (jobsIds: ObjectId[], params: any,
    keywordRegex?: any): Promise<{ and: ObjectId[], or: ObjectId[] }> => {
    // Get fields to be filtered as additional on the 'and'
    const { jobId, jobLocationId, technicianId } = params

    const queryJobsLinkedToIds: any = {
        $and: [
            {
                _id: {
                    $in: jobsIds
                }
            }
        ]
    }
    if (jobId) {
        const jobIdRegex = helper.getRegex(jobId, 'i');
        queryJobsLinkedToIds['$and'].push({ jobId: jobIdRegex });
    }
    if (technicianId) {
        queryJobsLinkedToIds['$and'].push({ $or: [{ 'jobObj.tasks.technician': new ObjectId(technicianId) }, { 'jobObj.tasks.contractor': new ObjectId(technicianId) }] });
    }
    if (jobLocationId) {
        queryJobsLinkedToIds['$and'].push({ jobLocation: new ObjectId(jobLocationId) });
    }

    const jobsLinkedToIds = await Job.aggregate([
        {
            $match: queryJobsLinkedToIds

        },
        {
            $project:
            {
                jobSite: 1,
                jobLocation: 1,
                "tasks.contractor": 1,
                "tasks.technician": 1,
            },
        },
    ]);

    const newJobsIds = jobsLinkedToIds.map((value) => value._id);
    const jobSitesIds = jobsLinkedToIds.map((value) => value.jobSite).filter((value) => value !== undefined)
    const jobLocationsIds = jobsLinkedToIds.map((value) => value.jobLocation).filter((value) => value !== undefined)
    const techniciansIds = jobsLinkedToIds.flatMap((value) => value.tasks.map((value: any) => value.technician).filter((value: any) => value !== undefined))
    const contractorsIds = jobsLinkedToIds.flatMap((value) => value.tasks.map((value: any) => value.contractor).filter((value: any) => value !== undefined))
    // Parallel processing
    const [filteredJobLocationsIds,
        { and: filteredJobsSiteIdsAnd, or: filteredJobsSiteIdsOr }, filteredTechnicianIds,
        filteredContractorsIds] = await Promise.all([_getFilteredJobLocationsIds(jobLocationsIds, keywordRegex), _getFilteredJobSitesIds(jobSitesIds, params, keywordRegex),
        _getFilteredTechniciansIds(techniciansIds, keywordRegex), _getFilteredContractorsIds(contractorsIds, keywordRegex)])
    const query: any = {
        $and: [{
            _id: {
                $in: newJobsIds,
            },
        },]
    };

    if (filteredJobsSiteIdsAnd) {
        query['$and'].push({ jobSite: { $in: filteredJobsSiteIdsAnd } });
    }

    let filteredJobsIdsAnd = null;
    if (queryJobsLinkedToIds['$and'].length > 1) {
        filteredJobsIdsAnd = newJobsIds
    }
    if (query['$and'].length > 1) {
        filteredJobsIdsAnd = (await Job.aggregate(
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
    }

    const queryOr: any = {
        $or: [
            {
                jobSite: {
                    $in: filteredJobsSiteIdsOr
                }
            },
            {
                jobLocation: {
                    $in: filteredJobLocationsIds,
                },
            },
            {
                "tasks.technician": {
                    $in: filteredTechnicianIds,
                },
            },
            {
                "tasks.contractor": {
                    $in: filteredContractorsIds,
                },
            },
        ]
    }

    if (keywordRegex) {
        queryOr['$or'].push({ jobId: keywordRegex });
    }
    query['$and'].push(queryOr);

    const filteredJobsIds = (await Job.aggregate(
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
    return { and: filteredJobsIdsAnd, or: filteredJobsIds };
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
    query['$and'].push({
        $or: [
            {
                name: keywordRegex
            },
            {
                "address.street": keywordRegex
            },
            {
                "address.city": keywordRegex
            },
        ],
    })

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
 * Get two array of job sites ids filtered by ids, additional params and keyword,
 * one array is used to be included on the parent 'and' match and the other to be included
 * on parent 'or' match
 * @param jobSitesIds job sites ids to be filtered
 * @param param1 additional params to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise<{ or: ObjectId[], and: ObjectId[] }>
 */
const _getFilteredJobSitesIds = async (jobSitesIds: ObjectId[],
    { jobAddress, jobCity, jobState, jobZip }: { jobAddress?: string, jobCity?: string, jobState?: string, jobZip?: string }, keywordRegex?: any):
    Promise<{ or: ObjectId[], and: ObjectId[] }> => {

    //and query
    const query: any = {
        $and: [{
            _id: {
                $in: jobSitesIds,
            },
        },]
    };
    // Add additional and conditions with the fields recieved on the params
    if (jobAddress) {
        const jobAddressRegex = helper.getRegex(jobAddress, 'i');
        query['$and'].push({
            $or: [
                {
                    'address.street': jobAddressRegex
                },
                {
                    name: jobAddressRegex
                }
            ]
        });
    }
    if (jobCity) {
        const jobCityRegex = helper.getRegex(jobCity, 'i');
        query['$and'].push({ 'address.city': jobCityRegex });
    }
    if (jobState) {
        const jobStateRegex = helper.getRegex(jobState, 'i');
        query['$and'].push({ 'address.state': jobStateRegex });
    }
    if (jobZip) {
        const jobZipRegex = helper.getRegex(jobZip, 'i');
        query['$and'].push({ 'address.zipcode': jobZipRegex });
    }

    let filteredJobSitesIdsUsingAnd = null
    // Get jobs sites ids using the and condition
    if (query['$and'].length > 1) {
        filteredJobSitesIdsUsingAnd = (await JobSite.aggregate([
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
    } else if (!keywordRegex) {
        //early return
        return { and: null, or: jobSitesIds };
    }
    // search by keword
    if (keywordRegex) {
        query['$and'].push({
            $or: [
                {
                    name: keywordRegex
                },
                {
                    "address.street": keywordRegex
                },
                {
                    "address.city": keywordRegex
                },
            ],
        });
    }
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
    return { and: filteredJobSitesIdsUsingAnd, or: filteredJobSitesIds };
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
    query['$and'].push({
        "profile.displayName": keywordRegex

    });

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
 * Partial method to check whether or not need to retrieve all record,
 * if no filter provided, BE will return the last 90 days records,
 * otherwise, all records shall be returned
 */
const _getIsAllRecordsByParams = async (params: any): Promise<boolean> => {
    // Default is only send the last 90 days records
    let isAllRecords = false;

    if (params.recentOnly) {
        return isAllRecords;
    }

    if (
        params.keyword ||
        params.invoiceId ||
        params.dueDate ||
        params.status ||
        (params.startAmount && params.endAmount) ||
        params.customerPO ||
        params.customerId ||
        params.customerContactId ||
        params.jobId ||
        params.jobLocationId ||
        params.jobAddress ||
        params.jobCity ||
        params.jobState ||
        params.jobZip ||
        params.technicianId ||
        (params.isDraft !== undefined && params.isDraft !== null) ||
        (params.isVoid !== undefined && params.isVoid !== null) ||
        (params.startDate && params.endDate) ||
        (params.lastEmailStartDate && params.lastEmailEndDate)
    ) {
        isAllRecords = true;
    }

    return isAllRecords;
}



/**
 * Get the ids of final filtered invoices
 * @param filteredInitialInvoices the initial filtered invoices ids
 * @param params param received on the request to filter
 * @returns Promise<ObjectId[]>
 */
const _getFinalInvoicesIds = async (filteredInitialInvoices: any[], params: any): Promise<ObjectId[]> => {
    // Get the ids linked to the invoices and that they are on other collections
    const invoicesIds = filteredInitialInvoices.map((value) => value._id);
    const jobsIds = filteredInitialInvoices.map((value) => value.job).filter((value) => value !== undefined);
    const customersIds = filteredInitialInvoices.map((value) => value.customer).filter((value) => value !== undefined);

    // Get fields 
    const { keyword } = params
    let keywordRegex = null;
    const queryNestedOr: any = {
        $or: []
    };
    if (keyword) {
        keywordRegex = helper.getRegex(keyword, 'i');
        queryNestedOr['$or'].push({ invoiceId: keywordRegex });
        queryNestedOr['$or'].push({ status: keywordRegex });
        queryNestedOr['$or'].push({ customerPO: keywordRegex });
        queryNestedOr['$or'].push({ vendorId: keywordRegex });
    }

    const [{ and: filteredJobsIdsAnd, or: filteredJobsIdsOr }, filteredCustomersIds] = await Promise.all([_getFilteredJobsIds(jobsIds, params, keywordRegex),
    _getFilteredCustomerIds(customersIds, keywordRegex)])

    const query: any = {
        $and: [
            { _id: { $in: invoicesIds } }
        ]
    };

    // Ensure when we need to include on 'and' condition the jobs id, because 
    // on request arrived a param to filter by 'and' condition
    if (filteredJobsIdsAnd) {
        query['$and'].push({
            job: {
                $in: filteredJobsIdsAnd,
            }
        });
    } else if (keywordRegex) {
        queryNestedOr['$or'].push({
            job: {
                $in: filteredJobsIdsOr,
            }
        });
    }
    // Check if is not necesary the 'or' codnition, because the keyword didn't arrived
    if (queryNestedOr['$or'].length > 0) {
        queryNestedOr['$or'].push({
            customer: {
                $in: filteredCustomersIds
            },
        });
        query['$and'].push(queryNestedOr);
    }
    return (await Invoice.aggregate([
        { $match: query },
        {
            $project:
            {
                _id: 1
            },
        },
    ])).map((value: any) => value._id);
}

/**
 * Retrieve all invoices data with filter options
 * Export invoices to excel
 * @param req request
 * @param res response
 * @returns invoices
 */
const _getDataInvoices = async (req: Request, res: Response) => {
    const params = req.body;
    const queryParams = req.query;
    let companyId = req.otherCompanyId || req.companyId;
    let currentPage = params.currentPage || 0;
    let pageSize = params.pageSize || DefaultPageSize;

    // Check if any filter provided to decide whether return all records or not
    let isAllRecords = await _getIsAllRecordsByParams(params);
    // Get the date of the last 90 days
    const last90days = moment().subtract(90, 'days').format();

    // Return error when all cursors are provided
    if (params.nextCursor && params.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }

    // Data query that used to search Invoices and available previous/next page
    const initialQuery: any = {
        $and: [{ company: companyId }]
    };

    // Add the last 90 days filter if need to return all records
    if (!isAllRecords) {
        initialQuery['$and'].push({ issuedDate: { $gte: new Date(last90days) } });
    }

    if (!params.allData) {
        // Add filters to initial query
        _fillInitialQuery(params, queryParams, initialQuery);
    }

    const filteredInitialInvoices = await Invoice.aggregate([
        { $match: initialQuery },
        {
            $project:
                {
                    job: 1,
                    customer: 1,
                },
        },
    ]);

    // Split the initial invoices into subarrays with 30,000 length, to do parallel processing
    const filteredInitialInvoicesSplited = splitArray(filteredInitialInvoices, 30000);
    const parallelFilter = filteredInitialInvoicesSplited.map((value: any[]) => _getFinalInvoicesIds(value, params));
    const finalInvoicesIds = (await Promise.all(parallelFilter)).flat()

    const finalQuery: any = {
        $and: [
            { _id: { $in: finalInvoicesIds } }
        ]
    };

    // Deep clone filter finalQuery
    const query: any = { $and: [] };
    finalQuery['$and'].map((q: any) => { query['$and'].push({ ...q }) });

    // Sort query that default to sort by the recent ones
    let sortQuery = { createdAt: -1, _id: -1 };

    let invoicesQuery: any = [
        {
            $match: { ...query }
        },
        {
            $sort: sortQuery
        },
    ];

    if (!params.allData) {
        invoicesQuery.push(...[
            { $skip: (currentPage * pageSize) },
            { $limit: params.pageSize || DefaultPageSize },
        ])
    }

    // Get the invoices limiting by the page size
    let invoices = await Invoice.aggregate(invoicesQuery)

    // Parallel processing ond fifferent queries that can be executed in parallel
    const parallelProcessing = [
        // Populate the invoices from aggregate
        Invoice.populate(invoices, [
            { path: 'job', select: 'jobId scheduleDate ticket jobLocation jobSite tasks customerContactId', populate: [{ path: 'jobLocation', select: 'name address location' }, { path: 'jobSite', select: 'name address location' }, { path: 'customerContactId', select: 'name email' }] },
            { path: 'paymentTerm', select: 'name dueDays' },
            { path: 'customer', select: 'info.email auth.email profile address contact vendorId contactName contactEmail' },
            { path: 'customerContactId', select: 'name phone email' },
            { path: 'jobLocation', select: 'name address location' },
            { path: 'jobSite', select: 'name address location' },
            { path: 'companyLocation', select: 'billingAddress name isMainLocation' },
            { path: 'workType', select: 'title' },
        ])
    ];

    await Promise.all(parallelProcessing)

    return invoices
}


/**
 * Convert invoice to row to be used on excel
 * @param invoice the invoice will be converted
 * @returns {
 *      paymentStatus
 *      invoiceID
 *      invoiceDate
 *      customer
 *      subDivision
 *      jobAddress
 *      customerPO
 *      total
 *      emailSendDate
 *      contactName
 *      contactEmail
 *   }
 */
export const _converInvoiceToRowExcel = (invoice: any): any => {
    const row = {
        paymentStatus: '',
        invoiceID: '',
        invoiceDate: '',
        customer: '',
        subDivision: '',
        jobAddress: '',
        customerPO: '',
        total: '',
        emailSendDate: '',
        contactName: '',
        contactEmail: '',
    };
    if (!invoice) {
        return row;
    }

    let subDivision = "";
    if (invoice?.jobLocation) {
        const jobLocation = invoice?.jobLocation;
        subDivision = jobLocation?.name;
    } else {
        //To check if invoice data is not provided with a job location, we can use the job field
        const jobLocation = invoice?.job?.jobLocation;
        subDivision = jobLocation?.name;
    }

    let jobAddressName;
    if (invoice?.jobSite) {
        const jobSite = invoice?.jobSite;
        jobAddressName = jobSite?.name;
    } else {
        //To check if invoice data is not provided with a job site, we can use the job field
        const jobSite = invoice?.job?.jobSite;
        jobAddressName = jobSite?.name;
    }

    let customerContact;
    if (invoice?.customerContactId) {
        customerContact = invoice?.customerContactId;
    } else {
        //To check if invoice data is not provided with a customer contact, we can use the job field
        customerContact = invoice?.job?.customerContactId;
    }


    row.paymentStatus = invoice.status;
    row.invoiceID = invoice?.invoiceId?.substring(8);
    row.invoiceDate = invoice.issuedDate || invoice.createdAt;
    row.customer = invoice?.customer?.profile?.displayName;
    row.subDivision = subDivision;
    row.jobAddress = jobAddressName;
    row.customerPO = invoice.customerPO || invoice.job?.customerPO || invoice.job?.ticket?.customerPO;
    row.total = invoice.total;
    row.emailSendDate = invoice.lastEmailSent;
    row.contactName = customerContact?.name;
    row.contactEmail = customerContact?.email;

    return row;
}