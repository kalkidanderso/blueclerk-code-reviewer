import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import { Status } from '../common/constants';
import { Invoice } from '../models/Invoice';

export const generateIncomeReport = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    let reportData;

    // Generate the income report based on which that requests by user
    switch (params.reportType) {
        case 2:
            return res.json({
                status: Status.Success,
                reportType: params.reportType,
                report: {},
                message: 'Custom report is not yet supported, please wait for the next update.'
            });

        case 1:
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
 * where only return the total amount, total unique customers and jobs
 */
const _standartIncomeReport = async (companyId: string, params: any): Promise<{totalIncome: number, customers: number, jobs: number}> => {

    const query: any = {
        company: companyId,
        isDraft: { $ne: true },
        isVoid: { $ne: true }
    };

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
        query.issuedDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Get the total income based on filter
    const totalIncomeAggregate = await Invoice.aggregate([
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
        { $match: { ...query } },
        { $group: { _id: { customer: "$customer" } } },
        { $count: "customers" }
    ]);

    // Get the total jobs based on filter
    const jobsAggregate = await Invoice.aggregate([
        { $match: { ...query, job: { $ne: null } } },
        { $count: "jobs" }
    ]);

    return {
        totalIncome: totalIncomeAggregate[0]?.totalIncome ?? 0,
        customers: customersAggregate[0]?.customers ?? 0,
        jobs: jobsAggregate[0]?.jobs ?? 0
    };

}
