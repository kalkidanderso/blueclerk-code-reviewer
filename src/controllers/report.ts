import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import { Status } from '../common/constants';
import { Invoice } from '../models/Invoice';
import { ICustomer } from '../models/Customer';
import { ReportTypes, ReportSources } from '../models/Report';

export const generateIncomeReport = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    let reportData;

    // Generate the income report based on which that requests by user
    switch (params.reportType) {
        case ReportTypes.CUSTOM:
            reportData = await _customIncomeReport(companyId, params);
            break;

        case ReportTypes.STANDARD:
        default:
            reportData = await _standartIncomeReport(companyId, params);
            break;
    }

    return res.json({
        status: Status.Success,
        reportType: params.reportType,
        report: reportData,
        filter: {
            ...params,
            customerIds: params.customerIds && JSON.parse(params.customerIds)
        }
    });

}

/**
 * Generate standard income report,
 * where only return the total amount, customers count, and jobs count
 */
const _standartIncomeReport = async (companyId: string, params: any): Promise<{ totalIncome: number, customerCount: number, jobCount: number }> => {

    // Call the generic function to generate the basic income report
    const { totalIncomeAggregate, customersAggregate, jobsAggregate } = await _generateIncomeReport(companyId, params);

    return {
        totalIncome: totalIncomeAggregate[0]?.totalIncome ?? 0,
        customerCount: customersAggregate[0]?.customers ?? 0,
        jobCount: jobsAggregate[0]?.jobs ?? 0
    };

}

/**
 * Generate custom income report,
 * return the total amount, customers count, jobs count,
 * and each customer's total
 */
const _customIncomeReport = async (companyId: string, params: any): Promise<{ totalIncome: number, customerCount: number, jobCount: number, customers: any[] }> => {

    const customers: any[] = [];

    // Call the generic function to generate the basic income report
    const { query, aggregateLookups, totalIncomeAggregate, customersAggregate, jobsAggregate } = await _generateIncomeReport(companyId, params);

    // Add additional aggregate to the Customer collection
    aggregateLookups.push({ $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customerObj' } });

    // Get the total unique customers based on filter
    const customerListAggregate = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        {
            $group: {
                _id: { customer: '$customerObj' },
                total: { '$sum': '$total' }
            }
        },
        { $sort: { '_id.customer.profile.displayName': 1 } }
    ]);

    // Iterate all invoices from customer aggregate
    for (const customerInvoice of customerListAggregate) {
        if (customerInvoice?._id?.customer.length) {
            const customer = <ICustomer>customerInvoice?._id?.customer[0];

            // Construct the readable information of customer
            customers.push({
                customer: {
                    _id: customer._id,
                    profile: customer.profile,
                    info: customer.info,
                    address: customer.address,
                    contact: customer.contact
                },
                total: customerInvoice?.total
            });
        }
    }

    return {
        totalIncome: totalIncomeAggregate[0]?.totalIncome ?? 0,
        customerCount: customersAggregate[0]?.customers ?? 0,
        jobCount: jobsAggregate[0]?.jobs ?? 0,
        customers
    };

}

/**
 * Generate basic income report,
 * where only return the total amount, customers count, and jobs count
 */
const _generateIncomeReport = async (companyId: string, params: any) => {

    const query: any = {
        company: companyId,
        isDraft: { $ne: true },
        isVoid: { $ne: true }
    };

    // Handle if report source from generated jobs
    if (params.reportSource === ReportSources.JOB) {
        query.job = { $ne: null };
    }
    // Handle if there multiple customers to be filtered
    if (params.customerIds) {
        const customerIds = [];
        for (const customerId of JSON.parse(params.customerIds)) {
            if (ObjectId.isValid(customerId)) {
                customerIds.push(new ObjectId(customerId));
            }
        }
        query.customer = { $in: customerIds };
    }
    // Handle if there startData and endDate to be filtered
    if (params.startDate && params.endDate) {
        const startDate = moment(params.startDate).format('YYYY-MM-DD');
        const endDate = moment(params.endDate).format('YYYY-MM-DD');

        switch (params.reportSource) {
            // Handle if report source from generated jobs
            case ReportSources.JOB:
                query['jobObj.scheduleDate'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
                break;

            // Handle if report source from invoice only
            case ReportSources.INVOICE:
            default:
                query.issuedDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
                break;
        }
    }

    // Construct aggregate lookups to the Job collection
    const aggregateLookups = [
        { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobObj' } }
    ]

    // Get the total income based on filter
    const totalIncomeAggregate = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        {
            $group: {
                _id: { company: "$company" },
                totalIncome: { $sum: "$total" }
            }
        }
    ]);

    // Get the total unique customers based on filter
    const customersAggregate = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        { $group: { _id: { customer: "$customer" } } },
        { $count: "customers" }
    ]);

    // Get the total jobs based on filter
    const jobsAggregate = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query, job: { $ne: null } } },
        { $count: "jobs" }
    ]);

    return {
        query,
        aggregateLookups,
        totalIncomeAggregate,
        customersAggregate,
        jobsAggregate
    }

}
