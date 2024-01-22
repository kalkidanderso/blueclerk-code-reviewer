import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import fs from 'fs';
import * as _ from 'lodash';
import * as helper from '../services/helper';

import { FONT_SETS, ACCOUNT_RECEIVABLE_REPORT_PDF_PATH, INVOICE_IMAGE_PATH } from '../common/config';
import { Layouts, Styles } from '../common/constants.pdf';
import { delimiterEnUs, roundTwoDecimal } from '../services/helper';

import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { Customer } from '../models/Customer';
import { JobLocation } from '../models/JobLocation';
import { Invoice } from '../models/Invoice';
import { AgingBuckets, IAccountReceivableReportResponse, ReportData } from '../models/Report';

const pdfmake = require('pdfmake');

/**
 * Generate standard account receivable report,
 * where only return the total unpaid and aging buckets,
 * the standard should be used for the A/R report graph
 */
export const _standardAccountReceivableReport = async (companyId: string, params: any) => {

    // Call the generic function to generate the basic AR report
    const { totalUnpaid, agingCurrent, aging130, aging3160, aging6190, aging91over } = await _generateAccountReceivableReport(companyId, params);

    return {
        totalUnpaid,
        agingCurrent,
        aging130,
        aging3160,
        aging6190,
        aging91over,
        globalAgingBuckets: {
            agingCurrent,
            aging130,
            aging3160,
            aging6190,
            aging91over,
        }
    };

};

/**
 * Generate custom account receivable report,
 * return the total unpaid and aging buckets,
 * and each customer's total unpaid
 */
export const _customAccountReceivableReport = async (companyId: string, params: any) => {

    let customers;
    let customerAgingBuckets: any[] = [];

    // Call the generic function to generate the basic AR report
    const { customerIds, query, totalUnpaid, agingCurrent, aging130, aging3160, aging6190, aging91over } = await _generateAccountReceivableReport(companyId, params);

    /**
     * Construct the global aging bucket,
     * when there is only one customer filtered,
     * global aging bucket is not necessary
     */
    let globalAgingBuckets;
    if (customerIds.length !== 1) {
        globalAgingBuckets = {
            agingCurrent,
            aging130,
            aging3160,
            aging6190,
            aging91over,
        };
    }

    // Handle if there asOf params provided, otherwise using today as default
    let asOf = params.asOf ? params.asOf : new Date();
    asOf = moment.utc(asOf).endOf('day').format();

    // Get the dates for aging bucket
    const { agingCurrentDate, aging130Date, aging3160Date, aging6190Date, aging91overDate } = await _getAgingBucketDates(asOf);

    // To get invoice's total if no balanceDue found for old invoices
    const balanceDue = { $ifNull: ['$balanceDue', '$total', 0] };

    // Get the list of customer that included on the A/R report
    const customerListAggregate = await Invoice.aggregate([
        { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customerObj' } },
        { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobObj' } },
        { $lookup: { from: 'joblocations', localField: 'jobObj.jobLocation', foreignField: '_id', as: 'jobLocationObj' } },
        { $lookup: { from: 'jobsites', localField: 'jobObj.jobSite', foreignField: '_id', as: 'jobSiteObj' } },
        { $lookup: { from: 'contacts', localField: 'jobObj.customerContactId', foreignField: '_id', as: 'customerContactObj' } },
        { $lookup: { from: 'contacts', localField: 'customerContactId', foreignField: '_id', as: 'invoiceContactObj' } },
        { $match: { ...query } },
        { $sort: { customer: -1, dueDate: 1 } },
        {
            $group: {
                _id: {
                    customer: '$customer',
                    dueDate: {
                        $let: {
                            vars: { dueDate: '$dueDate' },
                            in: {
                                $switch: {
                                    branches: [
                                        { case: { $lte: ['$$dueDate', new Date(aging91overDate)] }, then: AgingBuckets.AGING_91_OVER },
                                        { case: { $lte: ['$$dueDate', new Date(aging6190Date)] }, then: AgingBuckets.AGING_61_90 },
                                        { case: { $lte: ['$$dueDate', new Date(aging3160Date)] }, then: AgingBuckets.AGING_31_60 },
                                        { case: { $lte: ['$$dueDate', new Date(aging130Date)] }, then: AgingBuckets.AGING_1_30 },
                                        { case: { $gte: ['$$dueDate', new Date(agingCurrentDate)] }, then: AgingBuckets.CURRENT },
                                    ]
                                }
                            }
                        }
                    }
                },
                totalUnpaid: { $sum: balanceDue },
                customer: { $first: '$customerObj' },
                invoices: {
                    $push: {
                        _id: '$_id',
                        invoiceId: '$invoiceId',
                        isDraft: '$isDraft',
                        isVoid: '$isVoid',
                        issuedDate: '$issuedDate',
                        dueDate: '$dueDate',
                        total: { $round: ['$total', 2] },
                        balanceDue: { $round: [balanceDue, 2] },
                        jobLocation: { $first: '$jobLocationObj' },
                        jobSite: { $first: '$jobSiteObj' },
                        customerContact: { $first: '$customerContactObj' },
                        invoiceContact: { $first: '$invoiceContactObj' }
                    }
                }
            }
        }
    ]);

    // Prepare the customer list when customer filter is provided
    if (customerIds.length > 0) {
        // Retrieve all customers information
        customers = await Customer.find({ _id: { $in: customerIds } });

        /**
         * Iterate all customers and put them into aging buckets.
         * so even the customer don't have any amount owed,
         * they still will be on the list with empty aging bucket
         */
        for (const customer of customers) {
            customerAgingBuckets.push({
                customer,
                agingBuckets: []
            });
        }
    }

    // Iterate all invoices from customer aggregate
    for (const customerInvoice of customerListAggregate) {
        // Find if the customer already on the customers list
        const existingCustAB = customerAgingBuckets.find(customerAB => customerAB?.customer?._id?.toString() === customerInvoice?._id?.customer?.toString());

        // Construct the generic aging bucket content
        const agingBucket = {
            label: customerInvoice?._id?.dueDate,
            totalUnpaid: roundTwoDecimal(customerInvoice?.totalUnpaid),
            invoices: customerInvoice?.invoices,
        };

        if (!existingCustAB) {
            customerAgingBuckets.push({
                customer: customerInvoice?.customer[0],
                agingBuckets: [{ ...agingBucket }]
            });
        } else {
            existingCustAB?.agingBuckets?.push({ ...agingBucket });
        }
    }

    // Sort the customer list by display name
    customerAgingBuckets = _.sortBy(customerAgingBuckets, [(cab: any) => { return cab?.customer?.profile?.displayName?.toUpperCase(); }]);

    return {
        totalUnpaid,
        globalAgingBuckets,
        customerCount: customerAgingBuckets?.length,
        customerAgingBuckets
    };

};

/**
 * Generate basic account receivable report,
 * where only return the total unpaid and aging buckets
 */
const _generateAccountReceivableReport = async (companyId: string, params: any) => {
    const workType = params.workType;
    const companyLocation = params.companyLocation;
    
    // Construct the basic filter query
    const query: any = {
        company: new ObjectId(companyId),
        paid: { $ne: true },
        isDraft: { $ne: true },
        isVoid: { $ne: true }
    };

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {}
        query['workType'] = { $in : workTypeIds };
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {}
        query['companyLocation'] = { $in : companyLocationIds };
    }

    // Handle if there asOf params provided, otherwise using today as default
    let asOf = params.asOf ? params.asOf : new Date();
    asOf = moment.utc(asOf).endOf('day').format();

    // Handle if there multiple customers to be filtered
    const customerIds = [];
    if (params.customerIds) {
        for (const customerId of JSON.parse(params.customerIds)) {
            if (ObjectId.isValid(customerId)) {
                customerIds.push(new ObjectId(customerId));
            }
        }
        query.customer = { $in: customerIds };
    }

    // Get the total unpaid based on filter
    const totalUnpaid = await _getTotalUnpaid(query);

    // Aging bucket current (-999 to 0)
    const agingCurrent = await _getAgingBucket({ id: 1, label: AgingBuckets.CURRENT, asOf, end: 0, query });

    // Aging bucket 1 to 30
    const aging130 = await _getAgingBucket({ id: 2, label: AgingBuckets.AGING_1_30, asOf, start: 1, end: 30, query });

    // Aging bucket 31 to 60
    const aging3160 = await _getAgingBucket({ id: 3, label: AgingBuckets.AGING_31_60, asOf, start: 31, end: 60, query });

    // Aging bucket 61 to 90
    const aging6190 = await _getAgingBucket({ id: 4, label: AgingBuckets.AGING_61_90, asOf, start: 61, end: 90, query });

    // Aging bucket over 91
    const aging91over = await _getAgingBucket({ id: 5, label: AgingBuckets.AGING_91_OVER, asOf, start: 91, query });

    return {
        customerIds,
        query,
        totalUnpaid,
        agingCurrent,
        aging130,
        aging3160,
        aging6190,
        aging91over
    };

};

/**
 * To get the aging bucket by the given params
 * TODO: refactor using mongo $bucket
 */
const _getAgingBucket = async (
    { id, label, asOf, start, end, query }:
    { id: number, label: string, asOf?: string, start?: number, end?: number, query: any }
) => {

    const agingQuery = { ...query };

    if (start !== null && start !== undefined) {
        const startDate = moment.utc(asOf).subtract(start, 'days').endOf('day').format();
        agingQuery.dueDate = agingQuery.dueDate ?? {};
        agingQuery.dueDate['$lte'] = new Date(startDate);
    }

    if (end !== null && end !== undefined) {
        const endDate = moment.utc(asOf).subtract(end, 'days').startOf('day').format();
        agingQuery.dueDate = agingQuery.dueDate ?? {};
        agingQuery.dueDate['$gte'] = new Date(endDate);
    }

    // To get invoice's total if no balanceDue found for old invoices
    const balanceDue = { $ifNull: ['$balanceDue', '$total'] };

    const agingBucketAggregate = await Invoice.aggregate([
        { $match: { ...agingQuery } },
        {
            $group: {
                _id: { company: '$company' },
                totalUnpaid: { $sum: balanceDue }
            }
        }
    ]);

    return {
        agingBucketId: id,
        label,
        startPeriod: start,
        endPeriod: end,
        totalUnpaid: roundTwoDecimal(agingBucketAggregate[0]?.totalUnpaid),
    };

};

/**
 * Generate account receivable detail report,
 * return the total unpaid and aging buckets,
 * and each customer's total unpaid
 */
export const _generateAccountReceivableDetail = async (companyId: string, params: any) => {

    // Retrieve the customer and check if customer exist
    const customer = await Customer.findById(params.customerId);
    if (!customer) {
        throw new Error('Customer not found');
    }

    let jobLocationAgingBuckets: any[] = [];

    // Handle if there asOf params provided, otherwise using today as default
    let asOf = params.asOf ? params.asOf : new Date();
    asOf = moment.utc(asOf).endOf('day').format();

    // Construct the filter query
    const query: any = {
        company: new ObjectId(companyId),
        customer: customer._id,
        paid: { $ne: true },
        isDraft: { $ne: true },
        isVoid: { $ne: true }
    };

    // Prepare the job location list when job location filter is provided
    if (params.jobLocationIds?.length > 0) {
        const jobLocationIds = [];
        for (const jobLocationId of JSON.parse(params.jobLocationIds)) {
            if (ObjectId.isValid(jobLocationId)) {
                jobLocationIds.push(new ObjectId(jobLocationId));
            }
        }
        // Put the job locations filter to the query
        query['jobObj.jobLocation'] = { $in: jobLocationIds };

        // Retrieve all job locations filtered
        const jobLocations = await JobLocation.find({ _id: { $in: jobLocationIds } });
        /**
         * Iterate all job locations and put them into aging buckets.
         * so even the job location don't have any amount owed,
         * they still will be on the list with empty aging bucket
         */
        for (const jobLocation of jobLocations) {
            jobLocationAgingBuckets.push({
                jobLocation,
                agingBuckets: []
            });
        }
    }

    // Get the total grand unpaid
    const totalUnpaid = await _getTotalUnpaid(query);

    // Get the dates for aging bucket
    const { agingCurrentDate, aging130Date, aging3160Date, aging6190Date, aging91overDate } = await _getAgingBucketDates(asOf);

    // To get invoice's total if no balanceDue found for old invoices
    const balanceDue = { $ifNull: ['$balanceDue', '$total', 0] };

    // Get the selected customer aging bucket
    const customerAgingBucket = await _getCustomerAgingBucket(query, agingCurrentDate, aging130Date, aging3160Date, aging6190Date, aging91overDate);

    // Get the list of customer that included on the A/R report
    const jobLocationListAggregate = await Invoice.aggregate([
        { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobObj' } },
        { $lookup: { from: 'joblocations', localField: 'jobObj.jobLocation', foreignField: '_id', as: 'jobLocationObj' } },
        { $lookup: { from: 'jobsites', localField: 'jobObj.jobSite', foreignField: '_id', as: 'jobSiteObj' } },
        { $lookup: { from: 'contacts', localField: 'jobObj.customerContactId', foreignField: '_id', as: 'customerContactObj' } },
        { $lookup: { from: 'contacts', localField: 'customerContactId', foreignField: '_id', as: 'invoiceContactObj' } },
        { $match: { ...query } },
        { $sort: { customer: -1, dueDate: 1 } },
        {
            $group: {
                _id: {
                    jobLocationId: '$jobObj.jobLocation',
                    dueDate: {
                        $let: {
                            vars: { dueDate: '$dueDate' },
                            in: {
                                $switch: {
                                    branches: [
                                        { case: { $lte: ['$$dueDate', new Date(aging91overDate)] }, then: AgingBuckets.AGING_91_OVER },
                                        { case: { $lte: ['$$dueDate', new Date(aging6190Date)] }, then: AgingBuckets.AGING_61_90 },
                                        { case: { $lte: ['$$dueDate', new Date(aging3160Date)] }, then: AgingBuckets.AGING_31_60 },
                                        { case: { $lte: ['$$dueDate', new Date(aging130Date)] }, then: AgingBuckets.AGING_1_30 },
                                        { case: { $gte: ['$$dueDate', new Date(agingCurrentDate)] }, then: AgingBuckets.CURRENT },
                                    ]
                                }
                            }
                        }
                    }
                },
                totalUnpaid: { $sum: balanceDue },
                jobLocation: { $first: '$jobLocationObj' },
                invoices: {
                    $push: {
                        _id: '$_id',
                        invoiceId: '$invoiceId',
                        isDraft: '$isDraft',
                        isVoid: '$isVoid',
                        issuedDate: '$issuedDate',
                        dueDate: '$dueDate',
                        total: { $round: ['$total', 2] },
                        balanceDue: { $round: [balanceDue, 2] },
                        jobLocation: { $first: '$jobLocationObj' },
                        jobSite: { $first: '$jobSiteObj' },
                        customerContact: { $first: '$customerContactObj' },
                        invoiceContact: { $first: '$invoiceContactObj' }
                    }
                }
            }
        }
    ]);

    // Iterate all invoice from job location aggregate
    for (const jobLocationInvoice of jobLocationListAggregate) {
        // Find if the job location already on the job locations list
        const existingJLAB = jobLocationAgingBuckets.find(jobLocationAB => jobLocationAB?.jobLocation?._id?.toString() === jobLocationInvoice?._id?.jobLocationId?.[0]?.toString());

        // Construct the generic aging bucket content
        const agingBucket = {
            label: jobLocationInvoice?._id?.dueDate,
            totalUnpaid: roundTwoDecimal(jobLocationInvoice?.totalUnpaid),
            invoices: jobLocationInvoice?.invoices
        };

        if (!existingJLAB) {
            // Add all with no subdivision to this new list
            jobLocationAgingBuckets.push({
                jobLocation: jobLocationInvoice?.jobLocation?.[0] ?? {
                    _id: null,
                    name: '(no subdivision)'
                },
                agingBuckets: [{ ...agingBucket }]
            });
        } else {
            existingJLAB?.agingBuckets?.push({ ...agingBucket });
        }
    }

    // Sort the job location list by name
    jobLocationAgingBuckets = _.sortBy(jobLocationAgingBuckets, [(jlab: any) => { return jlab?.jobLocation?.name?.toUpperCase(); }]);

    // Move the '(no subdivision)' aging to the bottom of list
    const noSubdivisionGroup = jobLocationAgingBuckets.find(jlab => jlab.jobLocation?.name === '(no subdivision)');
    if (noSubdivisionGroup) {
        jobLocationAgingBuckets = [
            ...jobLocationAgingBuckets.filter(jlab => jlab.jobLocation?.name !== '(no subdivision)'),
            noSubdivisionGroup
        ];
    }

    return {
        totalUnpaid,
        customer,
        customerAgingBucket,
        jobLocationCount: jobLocationAgingBuckets?.length,
        jobLocationAgingBuckets
    };

};

/**
 * Generate account receivable invoices report,
 * return all invoices group by aging buckets
 */
export const _generateAccountReceivableInvoices = async (companyId: string, params: any) => {

    // Retrieve the customer and check if customer exist
    const customer = await Customer.findById(params.customerId);
    if (!customer) {
        throw new Error('Customer not found');
    }

    const invoiceAgingBuckets: any[] = [];
    let invoiceCount = 0;

    /**
     * Construct the filter for job location,
     * if param job location provided, set it that way,
     * otherwise, search any job without job location and any manual invoices
     */
    const filterJobLocation = params.jobLocationId
        ? { 'jobObj.jobLocation': new ObjectId(params.jobLocationId) }
        : {
            $or: [
                { 'jobObj.jobLocation': <any>null },
                { invoiceType: 3 }
            ]
        };

    // Construct the basic filter query
    const query: any = {
        company: new ObjectId(companyId),
        customer: new ObjectId(params.customerId),
        ...filterJobLocation,
        paid: { $ne: true },
        isDraft: { $ne: true },
        isVoid: { $ne: true }
    };

    // Check and add if params filter/search provided
    if (params.invoiceId) {
        const invoiceIdRegex = helper.getRegex(params.invoiceId, 'i');
        query['invoiceId'] = invoiceIdRegex;
    }
    if (params.jobSiteIds?.length > 0) {
        const jobSiteIds: any[] = [];
        for (const jobSiteId of JSON.parse(params.jobSiteIds)) {
            if (ObjectId.isValid(jobSiteId)) {
                jobSiteIds.push(new ObjectId(jobSiteId));
            }
        }
        query['jobObj.jobSite'] = { $in: jobSiteIds };
    }

    // Handle if there asOf params provided, otherwise using today as default
    let asOf = params.asOf ? params.asOf : new Date();
    asOf = moment.utc(asOf).endOf('day').format();

    // Get the total unpaid based on filter
    const totalUnpaid = await _getTotalUnpaid(query);

    // Get the dates for aging bucket
    const { agingCurrentDate, aging130Date, aging3160Date, aging6190Date, aging91overDate } = await _getAgingBucketDates(asOf);

    // To get invoice's total if no balanceDue found for old invoices
    const balanceDue = { $ifNull: ['$balanceDue', '$total', 0] };

    const invoiceListAggregate = await Invoice.aggregate([
        { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobObj' } },
        { $lookup: { from: 'joblocations', localField: 'jobObj.jobLocation', foreignField: '_id', as: 'jobLocationObj' } },
        { $lookup: { from: 'jobsites', localField: 'jobObj.jobSite', foreignField: '_id', as: 'jobSiteObj' } },
        { $lookup: { from: 'contacts', localField: 'jobObj.customerContactId', foreignField: '_id', as: 'customerContactObj' } },
        { $lookup: { from: 'contacts', localField: 'customerContactId', foreignField: '_id', as: 'invoiceContactObj' } },
        { $match: { ...query } },
        { $sort: { customer: -1, dueDate: 1 } },
        {
            $group: {
                _id: {
                    dueDate: {
                        $let: {
                            vars: { dueDate: '$dueDate' },
                            in: {
                                $switch: {
                                    branches: [
                                        { case: { $lte: ['$$dueDate', new Date(aging91overDate)] }, then: AgingBuckets.AGING_91_OVER },
                                        { case: { $lte: ['$$dueDate', new Date(aging6190Date)] }, then: AgingBuckets.AGING_61_90 },
                                        { case: { $lte: ['$$dueDate', new Date(aging3160Date)] }, then: AgingBuckets.AGING_31_60 },
                                        { case: { $lte: ['$$dueDate', new Date(aging130Date)] }, then: AgingBuckets.AGING_1_30 },
                                        { case: { $gte: ['$$dueDate', new Date(agingCurrentDate)] }, then: AgingBuckets.CURRENT },
                                    ]
                                }
                            }
                        }
                    }
                },
                totalUnpaid: { $sum: balanceDue },
                invoices: {
                    $push: {
                        _id: '$_id',
                        invoiceId: '$invoiceId',
                        isDraft: '$isDraft',
                        isVoid: '$isVoid',
                        issuedDate: '$issuedDate',
                        dueDate: '$dueDate',
                        total: { $round: ['$total', 2] },
                        balanceDue: { $round: [balanceDue, 2] },
                        jobLocation: { $first: '$jobLocationObj' },
                        jobSite: { $first: '$jobSiteObj' },
                        customerContact: { $first: '$customerContactObj' },
                        invoiceContact: { $first: '$invoiceContactObj' }
                    }
                }
            }
        }
    ]);

    // Construct the aging grouping for the list
    const agingBuckets = [
        { name: AgingBuckets.CURRENT },
        { name: AgingBuckets.AGING_1_30 },
        { name: AgingBuckets.AGING_31_60 },
        { name: AgingBuckets.AGING_61_90 },
        { name: AgingBuckets.AGING_91_OVER }
    ];

    // Push the aging default group to the invoice aging buckets
    for (const agingBucket of agingBuckets) {
        invoiceAgingBuckets.push({
            name: agingBucket.name,
            invoices: []
        });
    }

    // Iterate all invoices from invoice aggregate
    for (const invoiceAggregate of invoiceListAggregate) {
        // Find if the invoice already on the invoice aging bucket list
        const existingInvoice = invoiceAgingBuckets.find(invoiceAB => invoiceAB?.name === invoiceAggregate?._id?.dueDate);

        // Sort the invoice list by invoice ID
        const invoices = _.sortBy(invoiceAggregate.invoices, [(ia: any) => { return ia?.invoiceId?.toUpperCase(); }]);

        if (!existingInvoice) {
            invoiceAgingBuckets.push({
                name: invoiceAggregate?._id?.dueDate,
                invoices: [...invoices]
            });
        } else {
            existingInvoice.invoices?.push(...invoices);
        }

        invoiceCount += invoiceAggregate.invoices?.length;
    }

    return {
        totalUnpaid,
        customer,
        invoiceCount,
        invoiceAgingBuckets
    };

};

// ==============================
// ==========[ PDF ]=============
// ==============================

// Partial method to generate A/R Report PDF
export const _generateAccountReceivableReportPdf = async({
    user,
    company,
    params
}: {
    user: IUser,
    company: ICompany,
    params: any
}): Promise<{ fullPath: string, accountReceivableReport: IAccountReceivableReportResponse }> => {

    let accountReceivableReport: IAccountReceivableReportResponse;
    let reportType: string;

    // Retrieve the report data based, either standard or custom
    switch (params.reportData) {
    case ReportData.CUSTOM:
        accountReceivableReport = await _customAccountReceivableReport(company._id, params);
        break;

    case ReportData.STANDARD:
    default:
        accountReceivableReport = await _standardAccountReceivableReport(company._id, params);
        break;
    }

    // Initialize PDF Make
    const pdfMake = new pdfmake(FONT_SETS.ROBOTO);
    // Generate the PDF content
    const generatePdf = await _handleReportPdf({ company, accountReceivableReport, user, params });
    // Construct the PDF full path
    const fullPath = `${ACCOUNT_RECEIVABLE_REPORT_PDF_PATH}/${Date.now()}.pdf`;

    return new Promise((resolve) => {
        // Check if folder path exist, create if not
        if (!fs.existsSync(ACCOUNT_RECEIVABLE_REPORT_PDF_PATH)) {
            fs.mkdirSync(ACCOUNT_RECEIVABLE_REPORT_PDF_PATH);
        }
        // Check if existing Invoice PDF exist, remove if any
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        const pdfDoc = pdfMake.createPdfKitDocument(generatePdf);
        const writeStream = fs.createWriteStream(fullPath);
        pdfDoc.pipe(writeStream);
        pdfDoc.end();
        writeStream.on('finish', resolve);
    }).then(() => {
        return { fullPath, accountReceivableReport };
    });

};

// Partial method to generate the PDF content of A/R Report
const _handleReportPdf = async({
    company,
    accountReceivableReport,
    user,
    params,
}: {
    company: ICompany,
    accountReceivableReport: IAccountReceivableReportResponse,
    user: IUser,
    params: any,
}): Promise<any> => {

    // Handle As Of information if there asOf params provided, otherwise using today as default
    let asOf = params.asOf ? params.asOf : moment().format('YYYY-MM-DD');
    asOf = moment.utc(asOf).format('MMM. DD, YYYY');

    // Handle Customer filter information if there customers param provided
    let customerNames: string[];
    let customerNamesStr = 'All';
    if (params.customerIds) {
        const customerIds = [];
        for (const customerId of JSON.parse(params.customerIds)) {
            if (ObjectId.isValid(customerId)) {
                customerIds.push(new ObjectId(customerId));
            }
        }
        const customers = await Customer.find({ _id: { $in: customerIds } }).sort({ 'profile.displayName': 1 });
        customerNames = customers.map(cust => cust.profile?.displayName);
        customerNamesStr = customerNames.join(', ');
    }

    // Construct empty table object for the customer and its aging list
    const customerAgingTable: any = {
        headerRows: 1,
        widths: [35, 127, 63, 63, 63, 63, 63, 63, 35],
        height: 10,
        body: [],
    };

    // Add AR Report's customer aging buckets to table object
    const bodyTable: any = [];
    if (accountReceivableReport?.customerAgingBuckets?.length) {
        bodyTable.push([
            {},
            { text: 'Customer', style: 'defaultFontBold' },
            { text: AgingBuckets.CURRENT, style: 'defaultFontBold', alignment: 'right' },
            { text: AgingBuckets.AGING_1_30, style: 'defaultFontBold', alignment: 'right' },
            { text: AgingBuckets.AGING_31_60, style: 'defaultFontBold', alignment: 'right' },
            { text: AgingBuckets.AGING_61_90, style: 'defaultFontBold', alignment: 'right' },
            { text: AgingBuckets.AGING_91_OVER, style: 'defaultFontBold', alignment: 'right' },
            { text: 'Total', style: 'defaultFontBold', alignment: 'right' },
            {}
        ]);

        /**
         * Iterate all customer aging buckets,
         * and push them to the customer aging table
         */
        for (const customerAgingBucket of accountReceivableReport?.customerAgingBuckets) {
            const customer = customerAgingBucket?.customer;
            const customerAging = customerAgingBucket?.agingBuckets;

            const agingCurrent = customerAging?.find(ab => ab.label === AgingBuckets.CURRENT)?.totalUnpaid;
            const aging130 = customerAging?.find(ab => ab.label === AgingBuckets.AGING_1_30)?.totalUnpaid;
            const aging3160 = customerAging?.find(ab => ab.label === AgingBuckets.AGING_31_60)?.totalUnpaid;
            const aging6190 = customerAging?.find(ab => ab.label === AgingBuckets.AGING_61_90)?.totalUnpaid;
            const aging91over = customerAging?.find(ab => ab.label === AgingBuckets.AGING_91_OVER)?.totalUnpaid;
            const totalAging = (agingCurrent ?? 0) + (aging130 ?? 0) + (aging3160 ?? 0) + (aging6190 ?? 0) + (aging91over ?? 0);

            bodyTable.push([
                {},
                { text: `${customer?.profile?.displayName ?? ''}`, style: 'lineFontBold' },
                { text: `${delimiterEnUs(agingCurrent)}`, style: 'lineFontGrayBold' },
                { text: `${delimiterEnUs(aging130)}`, style: 'lineFontGrayBold' },
                { text: `${delimiterEnUs(aging3160)}`, style: 'lineFontGrayBold' },
                { text: `${delimiterEnUs(aging6190)}`, style: 'lineFontGrayBold' },
                { text: `${delimiterEnUs(aging91over)}`, style: 'lineFontGrayBold' },
                { text: `${delimiterEnUs(totalAging)}`, style: 'lineFontGrayBold' },
                {}
            ]);
        }
    }

    bodyTable.push([{}, {}, {}, {}, {}, {}, {}, {}, {}]);
    for (let i = 0; i < bodyTable.length; i++) {
        customerAgingTable.body.push(bodyTable[i]);
    }

    // ===================================
    // ===[ INITIALIZE PDF TEMPLATE ]=====
    // ===================================
    const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [0, 0, 70, 30],
        content: [
            {
                // HEADER FIRST LINE: COMPANY NAME & AR REPORT TITLE
                table: {
                    widths: [24, 397, 120, 24],
                    body: [
                        [
                            {},
                            {
                                text: `${company.info?.companyName ?? ''}`,
                                style: 'title',
                                border: undefined
                            },
                            {
                                text: 'A/R REPORT',
                                style: 'title',
                                alignment: 'right',
                                border: undefined
                            },
                            {}
                        ],
                    ],
                },
                layout: {
                    ...Layouts.noBorders,
                    paddingTop: (i: number, node: any) => { return 35; },
                    paddingBottom: (i: number, node: any) => { return 15; },
                },
                style: 'titleTable'
            },
            {
                // HEADER SECOND LINE: FILTERS & TOTAL OUTSTANDING
                table: {
                    widths: [24, 100, 308, 100, 24],
                    body: [
                        [
                            {},
                            { text: 'As Of', style: 'smallFont' },
                            { text: 'Customer(s)', style: 'smallFont', },
                            { text: 'TOTAL OUTSTANDING', style: 'smallFontGray', alignment: 'right' },
                            {}
                        ],
                        [
                            {},
                            { text: `${asOf}`, style: 'reportFilter' },
                            { text: `${customerNamesStr}`, style: 'reportFilter' },
                            { text: `${delimiterEnUs(accountReceivableReport.totalUnpaid)}`, style: 'totalOutstanding', margin: [0, 0, 0, 20] },
                            {}
                        ],
                    ]
                },
                layout: { ...Layouts.noBorders },
                style: 'titleTable'
            },
            {
                // GLOBAL AGING BUCKETS
                table: {
                    widths: [24, 102, 102, 102, 102, 102, 24],
                    body: [
                        [
                            {},
                            [
                                { text: `${AgingBuckets.CURRENT}`, style: 'globalAgingTitle', },
                                { text: `${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.agingCurrent?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            [
                                { text: `${AgingBuckets.AGING_1_30}`, style: 'globalAgingTitle' },
                                { text: `${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.aging130?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            [
                                { text: `${AgingBuckets.AGING_31_60}`, style: 'globalAgingTitle' },
                                { text: `${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.aging3160?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            [
                                { text: `${AgingBuckets.AGING_61_90}`, style: 'globalAgingTitle' },
                                { text: `${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.aging6190?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            [
                                { text: `${AgingBuckets.AGING_91_OVER}`, style: 'globalAgingTitle' },
                                { text: `${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.aging91over?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            {}
                        ],
                        [{}, {}, {}, {}, {}, {}, {}],
                    ]
                },
                layout: { ...Layouts.custom },
            },
            {
                // CUSTOMER LIST AGING BUCKETS
                table: customerAgingTable,
                layout: {
                    ...Layouts.custom,
                    paddingLeft: (i: number, node: any) => { return 1; },
                    paddingRight: (i: number, node: any) => { return 1; },
                    paddingTop: (i: number, node: any) => { return 15; },
                    paddingBottom: (i: number, node: any) => { return 5; },
                },
            }
        ],
        footer: (currentPage: number, pageCount: number) => {
            return [{
                table: {
                    widths: [24, 427, 85, 24],
                    body: [
                        [
                            {},
                            {
                                text: `Generated for ${company.info?.companyName ?? ''} by ${user.profile?.displayName ?? ''} on ${moment(new Date()).format('MMM. DD, YYYY, hh:mm A')}`,
                                style: 'smallFontGray',
                                margin: [0, 10]
                            },
                            {
                                text: `Page ${currentPage} of ${pageCount}`,
                                style: 'smallFontGray',
                                alignment: 'right',
                                margin: [0, 10]
                            },
                            {}
                        ],
                    ],
                },
                fillColor: '#EAECF3',
                layout: { ...Layouts.noBorders },
            }];
        },
        styles: Styles.arReport,
        defaultStyle: {
            columnGap: 10,
            font: 'Roboto',
        },
    };

    return docDefinition;

};

/**
 * Generic partial method to get grand total unpaid
 */
const _getTotalUnpaid = async (query: any): Promise<number> => {
    // To get invoice's total if no balanceDue found for old invoices
    const balanceDue = { $ifNull: ['$balanceDue', '$total'] };

    // Get the total unpaid based on filter
    const totalUnpaidAggregate = await Invoice.aggregate([
        { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobObj' } },
        { $match: { ...query } },
        {
            $group: {
                _id: { company: '$company' },
                totalUnpaid: { $sum: balanceDue }
            }
        }
    ]);

    return roundTwoDecimal(totalUnpaidAggregate[0]?.totalUnpaid);
};

/**
 * Generic partial method to get aging bucket dates
 */
const _getAgingBucketDates = async (date: string): Promise<{ agingCurrentDate: string, aging130Date: string, aging3160Date: string, aging6190Date: string, aging91overDate: string }> => {
    const agingCurrentDate = moment.utc(date).startOf('day').format();
    const aging130Date = moment.utc(date).subtract(1, 'days').endOf('day').format();
    const aging3160Date = moment.utc(date).subtract(31, 'days').endOf('day').format();
    const aging6190Date = moment.utc(date).subtract(61, 'days').endOf('day').format();
    const aging91overDate = moment.utc(date).subtract(91, 'days').endOf('day').format();

    return { agingCurrentDate, aging130Date, aging3160Date, aging6190Date, aging91overDate };
};

/**
 * Partial method to get selected customer aging bucket
 */
const _getCustomerAgingBucket = async (query: any, agingCurrentDate: string, aging130Date: string, aging3160Date: string, aging6190Date: string, aging91overDate: string): Promise<any> => {
    // To get invoice's total if no balanceDue found for old invoices
    const balanceDue = { $ifNull: ['$balanceDue', '$total', 0] };

    const customerListAggregate = await Invoice.aggregate([
        { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customerObj' } },
        { $match: { ...query } },
        { $sort: { customer: -1, dueDate: 1 } },
        {
            $group: {
                _id: {
                    customer: '$customer',
                    dueDate: {
                        $let: {
                            vars: { dueDate: '$dueDate' },
                            in: {
                                $switch: {
                                    branches: [
                                        { case: { $lte: ['$$dueDate', new Date(aging91overDate)] }, then: AgingBuckets.AGING_91_OVER },
                                        { case: { $lte: ['$$dueDate', new Date(aging6190Date)] }, then: AgingBuckets.AGING_61_90 },
                                        { case: { $lte: ['$$dueDate', new Date(aging3160Date)] }, then: AgingBuckets.AGING_31_60 },
                                        { case: { $lte: ['$$dueDate', new Date(aging130Date)] }, then: AgingBuckets.AGING_1_30 },
                                        { case: { $gte: ['$$dueDate', new Date(agingCurrentDate)] }, then: AgingBuckets.CURRENT },
                                    ]
                                }
                            }
                        }
                    }
                },
                totalUnpaid: { $sum: balanceDue },
            }
        }
    ]);

    const customerAgingBucket = [];
    // Iterate all invoices from customer aggregate
    for (const customerInvoice of customerListAggregate) {
        customerAgingBucket.push({
            label: customerInvoice?._id?.dueDate,
            totalUnpaid: roundTwoDecimal(customerInvoice?.totalUnpaid),
        });
    }

    return customerAgingBucket;
};