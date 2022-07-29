import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import { Status } from '../common/constants';
import { Invoice } from '../models/Invoice';
import { ICustomer } from '../models/Customer';
import { ReportTypes, ReportData, ReportSources, IncomeReport, MemorizedReport, IIncomeReport, IMemorizedReport, IAllReport } from '../models/Report';


/**
 * Generate Report with reportType 1 (INCOME)
 */
export const generateIncomeReport = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    let incomeReport;

    // Generate the income report based on which that requests by user
    switch (params.reportData) {
        case ReportData.CUSTOM:
            incomeReport = await _customIncomeReport(companyId, params);
            break;

        case ReportData.STANDARD:
        default:
            incomeReport = await _standartIncomeReport(companyId, params);
            break;
    }

    return res.json({
        status: Status.Success,
        reportType: ReportTypes.INCOME,
        reportData: params.reportData,
        report: incomeReport,
        filter: {
            ...params,
            customerIds: params.customerIds && JSON.parse(params.customerIds)
        }
    });

}

/**
 * Retrieve all Memorized Reports by the Company
 */
export const getMemorizedReports = async (req: Request, res: Response) => {

    const companyId = req.companyId;

    const memorizedReports = await MemorizedReport.find({ company: companyId });

    return res.json({ status: Status.Success, memorizedReports });

}

/**
 * Retrieve one detail Memorized Report by the ID
 */
export const getMemorizedReport = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;

    const memorizedReport = await MemorizedReport.findOne({ _id: params.memorizedReportId, company: companyId });

    if (!memorizedReport) {
        return res.json({ status: Status.Error, message: 'Memorized report not found' });
    }

    return res.json({ status: Status.Success, memorizedReport });

}

/**
 * Memorized a new Custom Report
 */
export const createMemorizedReport = async (req: Request, res: Response) => {

    const params = req.body;
    const companyId = req.companyId;

    // To handle stringified params customerIds
    params.customerIds = params.customerIds ?? [];
    try {
        if (!Array.isArray(params.customerIds)) {
            params.customerIds = JSON.parse(params.customerIds);

            // To handle any over-stringified strings
            if (!Array.isArray(params.customerIds)) {
                params.customerIds = JSON.parse(params.customerIds);
            }
        }
    } catch (err) {
        return res.json({ status: Status.Error, message: 'Params customerIds format is invalid' });
    }

    // Use params name or generate a default report name
    const reportName = await _generateDefaultReportName(companyId, params.name, null);

    let memorizedReport;

    // Memorized the report by the Report Type
    switch (params.reportType) {
        case ReportTypes.INCOME:
        default:
            // INCOME REPORT TYPE
            memorizedReport = await new IncomeReport({
                company: companyId,
                reportType: ReportTypes.INCOME,
                name: reportName,
                ...params
            }).save();
            break;
    }

    return res.json({
        status: Status.Success,
        message: 'Custom report memorized successfully.',
        reportType: params.reportType,
        memorizedReport
    });

}

/**
 * Update one Memorized Report by the ID
 */
export const updateMemorizedReport = async (req: Request, res: Response) => {

    const params = req.body;
    const companyId = req.companyId;

    // Find and check the memorized report
    let memorizedReport: IAllReport = await MemorizedReport.findOne({ company: companyId, _id: params.memorizedReportId });
    if (!memorizedReport) {
        return res.json({ status: Status.Error, message: 'Memorized report not found' });
    }

    // To handle stringified params customerIds
    params.customerIds = params.customerIds ?? [];
    try {
        if (!Array.isArray(params.customerIds)) {
            params.customerIds = JSON.parse(params.customerIds);

            // To handle any over-stringified strings
            if (!Array.isArray(params.customerIds)) {
                params.customerIds = JSON.parse(params.customerIds);
            }
        }
    } catch (err) {
        return res.json({ status: Status.Error, message: 'Params customerIds format is invalid' });
    }

    // Use params name or generate a default report name
    const reportName = await _generateDefaultReportName(companyId, params.name, memorizedReport._id);

    // Memorized the report by the Report Type
    switch (memorizedReport.reportType) {
        case ReportTypes.INCOME:
        default:
            // INCOME REPORT TYPE
            const memorizedIncomeReport = <IIncomeReport>memorizedReport;

            memorizedIncomeReport.name = reportName;
            memorizedIncomeReport.reportData = params.reportData;
            memorizedIncomeReport.reportSource = params.reportSource;
            memorizedIncomeReport.customerIds = params.customerIds;
            memorizedIncomeReport.periodOption = params.periodOption;
            memorizedIncomeReport.startDate = params.startDate;
            memorizedIncomeReport.endDate = params.endDate;
            await memorizedIncomeReport.save();

            break;
    }

    return res.json({
        status: Status.Success,
        message: 'Memorized report updated successfully.',
        reportType: memorizedReport.reportType,
        memorizedReport
    });

}

export const deleteMemorizedReport = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;

    // Find and check the memorized report
    const memorizedReport: IAllReport = await MemorizedReport.findOne({ company: companyId, _id: params.memorizedReportId });
    if (!memorizedReport) {
        return res.json({ status: Status.Error, message: 'Memorized report not found' });
    }

    const deletedMemorizedReport = await MemorizedReport.findByIdAndDelete(memorizedReport._id);

    return res.json({
        status: Status.Success,
        message: 'Memorized report deleted successfully.',
        deletedMemorizedReport
    })

}


// ==================================
//     [ PARTIAL METHODS BELOW ]
// ==================================


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

/**
 * Generate default report name,
 * when params.name is not provided
 */
const _generateDefaultReportName = async (companyId: string, name: string, memorizedReportId: string): Promise<string> => {

    const defaultNameFormat = 'Memorized Report #';
    let reportName = name;

    if (!name) {
        const existingReportCount = await MemorizedReport.find({
            company: companyId,
            name: { $regex: defaultNameFormat },
            _id: { $nin: [memorizedReportId] }
        }).countDocuments();
        reportName = `${defaultNameFormat}${existingReportCount + 1}`;
    }

    return reportName;

}
