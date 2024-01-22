import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import fs from 'fs';

import { sendReportPdf, uploadFileInS3 } from '../services/aws';
import { Messages, Status } from '../common/constants';
import { INCOME_REPORT_PDF_PATH, INVOICE_FONT_PATH, INVOICE_IMAGE_PATH } from '../common/config';
import { delimiterEnUs } from '../services/helper';

import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { EmailDefault, EmailTypes } from '../models/EmailDefault';
import { Invoice } from '../models/Invoice';
import { ICustomer } from '../models/Customer';
import { ReportTypes, ReportData, ReportSources, IncomeReport, MemorizedReport, IIncomeReport, IMemorizedReport, IAllReport, IIncomeReportResponse, ReportTypesString } from '../models/Report';

import { getPlaceholderValues, transformPlaceholders, _createCompanyDefaultEmail } from '../controllers/emailDefault';
import { downloadFileToPath } from '../controllers/invoice';
import { _customAccountReceivableReport, _generateAccountReceivableDetail, _generateAccountReceivableInvoices, _generateAccountReceivableReportPdf, _standardAccountReceivableReport } from '../controllers/report.ar';
import * as Sentry from '@sentry/node';

const pdfmake = require('pdfmake');


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
        incomeReport = await _standardIncomeReport(companyId, params);
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

};

/**
 * Generate Report with reportType 2 (ACCOUNT_RECEIVABLE)
 */
export const generateAccountReceivableReport = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    let accountReceivableReport;

    // Generate the income report based on which that requests by user
    switch (params.reportData) {
    case ReportData.CUSTOM:
        accountReceivableReport = await _customAccountReceivableReport(companyId, params);
        break;

    case ReportData.STANDARD:
    default:
        accountReceivableReport = await _standardAccountReceivableReport(companyId, params);
        break;
    }

    return res.json({
        status: Status.Success,
        reportType: ReportTypes.ACCOUNT_RECEIVABLE,
        reportData: params.reportData,
        report: accountReceivableReport,
        filter: {
            ...params,
            customerIds: params.customerIds && JSON.parse(params.customerIds)
        }
    });

};

/**
 * Generate Report with reportType 2 (ACCOUNT_RECEIVABLE),
 * For all subdivisions of the customer selected
 */
export const generateAccountReceivableDetail = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    let accountReceivableDetailReport;

    try {
        accountReceivableDetailReport = await _generateAccountReceivableDetail(companyId, params);
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: err.message });
    }

    return res.json({
        status: Status.Success,
        reportType: ReportTypes.ACCOUNT_RECEIVABLE,
        report: accountReceivableDetailReport,
        filter: { ...params }
    });

};

/**
 * Generate Report with reportType 2 (ACCOUNT_RECEIVABLE),
 * For all invoices of the subdivisions of the customer selected
 */
export const generateAccountReceivableInvoices = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    let accountReceivableInvoicesReport;

    try {
        accountReceivableInvoicesReport = await _generateAccountReceivableInvoices(companyId, params);
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: err.message });
    }

    return res.json({
        status: Status.Success,
        ReportTypes: ReportTypes.ACCOUNT_RECEIVABLE,
        report: accountReceivableInvoicesReport,
        filter: { ...params }
    });

};

/**
 * Retrieve all Memorized Reports by the Company
 */
export const getMemorizedReports = async (req: Request, res: Response) => {

    const companyId = req.companyId;

    const memorizedReports = await MemorizedReport.find({ company: companyId });

    return res.json({ status: Status.Success, memorizedReports });

};

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

};

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
        Sentry.captureException(err);
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

};

/**
 * Update one Memorized Report by the ID
 */
export const updateMemorizedReport = async (req: Request, res: Response) => {

    const params = req.body;
    const companyId = req.companyId;

    // Find and check the memorized report
    const memorizedReport: IAllReport = await MemorizedReport.findOne({ company: companyId, _id: params.memorizedReportId });
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
        Sentry.captureException(err);
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

};

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
    });

};

export const generateIncomeReportPdf = async (req: Request, res: Response) => {
    const params = req.query;
    const company = req.company;

    const generatedIncomeReport = await _generateIncomeReportPdf({
        user: <IUser>req.user,
        company,
        params
    });

    const reportUrl = await uploadFileInS3(generatedIncomeReport.fullPath, 'pdf');

    return res.json({
        status: Status.Success,
        reportType: ReportTypes.INCOME,
        reportData: params.reportData,
        incomeReportUrl: reportUrl,
        report: generatedIncomeReport.incomeReport,
        filter: {
            ...params,
            customerIds: params.customerIds && JSON.parse(params.customerIds)
        },
    });
};

/**
 * General Generate Report PDF Endpoint,
 * available report type:
 * 1) Income Report (Not been tested)
 * 2) A/R Report
 */
export const generateReportPdf = async (req: Request, res: Response) => {

    const { reportType } = req.params;
    const params = req.query;
    const company = req.company;

    let generatedReport;
    let report;

    // Generate and retrieve the report data PDF by the report type
    switch (reportType.toUpperCase()) {
    case ReportTypesString.ACCOUNT_RECEIVABLE.toUpperCase():
        generatedReport = await _generateAccountReceivableReportPdf({
            user: <IUser>req.user,
            company,
            params
        });
        report = generatedReport.accountReceivableReport;
        break;

    case ReportTypesString.INCOME.toUpperCase():
    default:
        generatedReport = await _generateIncomeReportPdf({
            user: <IUser>req.user,
            company,
            params
        });
        report = generatedReport.incomeReport;
        break;
    }

    // Upload the PDF to the AWS
    const reportUrl = await uploadFileInS3(generatedReport.fullPath, 'pdf');

    return res.json({
        status: Status.Success,
        reportType: reportType ?? ReportTypes.INCOME,
        reportData: params.reportData,
        reportUrl,
        report,
        filter: {
            ...params,
            customerIds: params.customerIds && JSON.parse(params.customerIds)
        }
    });

};

// TODO: To be deprecated
/**
 * Kris' remark (Nov 1st, 2022):
 * Already moved to generic getReportEmailTemplate,
 * New API: /getReportEmailTemplate/:reportType
 */
export const getIncomeReportEmailTemplate = async (req: Request, res: Response) => {
    const params = req.query;
    const company = <ICompany>req.company;
    let emailDefault = await EmailDefault.findOne({ company, emailType: EmailTypes.INCOME_REPORT });

    // Create email default if company doesn't have one yet
    if (!emailDefault) {
        await _createCompanyDefaultEmail(company, EmailTypes.INCOME_REPORT);
        emailDefault = await EmailDefault.findOne({ company, emailType: EmailTypes.INCOME_REPORT });
    }

    /**
     * Transfrom the email default placeholder symbol to fit Javascript Template Literal,
     * '{{' become '${' & '}}' become '}'
     */
    const dateRange = !(params.startDate && params.endDate) ? 'All Time' : `${moment(params.startDate).format('MMM. DD, YYYY')} - ${moment(params.endDate).format('MMM. DD, YYYY')}`;
    await transformPlaceholders(emailDefault);
    // Get available placeholder values for Invoice email template
    const { company_name, company_email, date_range } = await getPlaceholderValues({ company, dateRange });

    return res.json({
        status: Status.Success,
        emailTemplate: {
            from: company_email,
            subject: eval('`' + emailDefault.subject + '`'),
            message: eval('`' + emailDefault.message + '`')
        },
    });
};

// TODO: To be deprecated
/**
 * Kris' remark (Nov 1st, 2022):
 * Already moved to generic sendReportEmail,
 * New API: /sendReport/:reportType
 */
export const sendIncomeReportEmail = async (req: Request, res: Response) => {
    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // Retrieve company email default
    let emailDefault = await EmailDefault.findOne({ company, emailType: EmailTypes.INCOME_REPORT });

    // Create email default if company doesn't have one yet
    if (!emailDefault) {
        await _createCompanyDefaultEmail(company, EmailTypes.INCOME_REPORT);
        emailDefault = await EmailDefault.findOne({ company, emailType: EmailTypes.INCOME_REPORT });
    }

    await transformPlaceholders(emailDefault);
    const generateIncomeReport = await _generateIncomeReportPdf({
        user,
        company,
        params
    });

    const filePath = req.file?.path ?? generateIncomeReport.fullPath;
    let paramRecipients: string[];
    let recipientEmails: string[];
    let copyToMyself: boolean;
    try {
        // Handle the stringify array of recipients value
        if (params.recipients && !Array.isArray(params.recipients)) {
            paramRecipients = JSON.parse(params.recipients);
        }

        // Handle the stringify boolean value
        copyToMyself = params.copyToMyself
            ? params.copyToMyself === 'false' || params.copyToMyself === false
                ? false
                : !!params.copyToMyself
            : false;

        recipientEmails = paramRecipients?.length > 0
            ? paramRecipients
            : [user?.auth?.email];

        // Add the user's email himself if he want to receive copy email
        if (copyToMyself) {
            recipientEmails.push(user.auth?.email);
        }
    } catch (error) {
        Sentry.captureException(error);
        console.log(error);
        return res.json({ status: Status.Error, message: Messages.GenericError });
    }

    // Call AWS SES method
    await sendReportPdf({
        subject: params.subject ?? emailDefault?.subject,
        message: params.message ?? emailDefault?.message,
        sender_email: user.auth?.email,
        company_name: company.info?.companyName,
        company_email: company.info?.companyEmail,
        company_logo: company.info?.logoUrl,
        recipient_emails: recipientEmails,
        report_pdf: filePath,
        report_pdf_name: req.file?.originalname ?? filePath.replace(/^.*[\\\/]/, '')
    });

    // Update email history and last email sent info
    return res.json({ status: Status.Success, message: 'Report has been sent successfully.' });
};

export const getReportEmailTemplate = async (req: Request, res: Response) => {

    const { reportType } = req.params;
    const params = req.query;
    const company = <ICompany>req.company;
    let emailType, dateRange = 'All Time';

    switch (reportType.toUpperCase()) {
    case ReportTypesString.ACCOUNT_RECEIVABLE.toUpperCase():
        emailType = EmailTypes.ACCOUNT_RECEIVABLE_REPORT;
        break;

    case ReportTypesString.INCOME.toUpperCase():
    default:
        emailType = EmailTypes.INCOME_REPORT;
        dateRange = !(params.startDate && params.endDate) ? 'All Time' : `${moment(params.startDate).format('MMM. DD, YYYY')} - ${moment(params.endDate).format('MMM. DD, YYYY')}`;
        break;
    }

    // Retrieve company email default
    let emailDefault = await EmailDefault.findOne({ company, emailType });
    // Create email default if company coesn't have one yet
    if (!emailDefault) {
        await _createCompanyDefaultEmail(company, emailType);
        emailDefault = await EmailDefault.findOne({ company, emailType });
    }

    /**
     * Transfrom the email default placeholder symbol to fit Javascript Template Literal,
     * '{{' become '${' & '}}' become '}'
     */
    await transformPlaceholders(emailDefault);
    // Get available placeholder values for report email template
    const { company_name, company_email, date_range } = await getPlaceholderValues({ company, dateRange });

    return res.json({
        status: Status.Success,
        emailTemplate: {
            from: company_email,
            subject: eval('`' + emailDefault.subject + '`'),
            message: eval('`' + emailDefault.message + '`')
        }
    });

};

export const sendReportEmail = async (req: Request, res: Response) => {

    const { reportType } = req.params;
    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    let generatedReport, report, emailType;

    // Generate and retrieve the report data PDF by the report type
    switch (reportType) {
    case ReportTypesString.ACCOUNT_RECEIVABLE:
        generatedReport = await _generateAccountReceivableReportPdf({
            user, company, params
        });
        report = generatedReport.accountReceivableReport;
        emailType = EmailTypes.ACCOUNT_RECEIVABLE_REPORT;
        break;

    case ReportTypesString.INCOME:
    default:
        generatedReport = await _generateIncomeReportPdf({
            user, company, params
        });
        report = generatedReport.incomeReport;
        emailType = EmailTypes.INCOME_REPORT;
        break;
    }

    const filePath = req.file?.path ?? generatedReport.fullPath;
    let paramRecipients: string[];
    let recipientEmails: string[];
    const copyToMyself: boolean = params.copyToMyself;
    try {
        // Handle the stringify array of recipients value
        if (params.recipients && !Array.isArray(params.recipients)) {
            paramRecipients = JSON.parse(params.recipients);
        }

        recipientEmails = paramRecipients?.length > 0
            ? paramRecipients
            : [user?.auth?.email];

        // Add the user's email himself if he wants to receive copy email
        if (copyToMyself) {
            recipientEmails.push(user.auth?.email);
        }
    } catch (error) {
        Sentry.captureException(error);
        console.log(error);
        return res.json({ status: Status.Error, message: Messages.GenericError });
    }

    // Retrieve company email default
    let emailDefault = await EmailDefault.findOne({ company, emailType });
    // Create email default if company doesn't have one yet
    if (!emailDefault) {
        await _createCompanyDefaultEmail(company, emailType);
        emailDefault = await EmailDefault.findOne({ company, emailType });
    }
    await transformPlaceholders(emailDefault);

    // Call AWS SES method
    await sendReportPdf({
        subject: params.subject ?? emailDefault?.subject,
        message: params.message ?? emailDefault?.message,
        sender_email: user.auth?.email,
        company_name: company.info?.companyName,
        company_email: company.info?.companyEmail,
        company_logo: company.info?.logoUrl,
        recipient_emails: recipientEmails,
        report_pdf: filePath,
        report_pdf_name: req.file?.originalname ?? filePath.replace(/^.*[\\\/]/, '')
    });

    return res.json({ status: Status.Success, message: 'Report has been sent successfully.' });

};



// ==================================
//     [ PARTIAL METHODS BELOW ]
// ==================================


/**
 * Generate standard income report,
 * where only return the total amount, customers count, and jobs count
 */
const _standardIncomeReport = async (companyId: string, params: any): Promise<{ totalIncome: number, customerCount: number, jobCount: number }> => {

    // Call the generic function to generate the basic income report
    const { totalIncomeAggregate, customersAggregate, jobsAggregate } = await _generateIncomeReport(companyId, params);

    return {
        totalIncome: totalIncomeAggregate[0]?.totalIncome ?? 0,
        customerCount: customersAggregate[0]?.customers ?? 0,
        jobCount: jobsAggregate[0]?.jobs ?? 0
    };

};

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

};

/**
 * Generate basic income report,
 * where only return the total amount, customers count, and jobs count
 */
const _generateIncomeReport = async (companyId: string, params: any) => {
    const workType = params.workType;
    const companyLocation = params.companyLocation;

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

    // Construct aggregate lookups to the Job collection
    const aggregateLookups = [
        { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobObj' } }
    ];

    // Get the total income based on filter
    const totalIncomeAggregate = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        {
            $group: {
                _id: { company: '$company' },
                totalIncome: { $sum: '$total' }
            }
        }
    ]);

    // Get the total unique customers based on filter
    const customersAggregate = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        { $group: { _id: { customer: '$customer' } } },
        { $count: 'customers' }
    ]);

    // Get the total jobs based on filter
    const jobsAggregate = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query, job: { $ne: null } } },
        { $count: 'jobs' }
    ]);

    return {
        query,
        aggregateLookups,
        totalIncomeAggregate,
        customersAggregate,
        jobsAggregate
    };

};

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

};

export const _generateIncomeReportPdf = async ({
    user,
    company,
    params
}: {
    user: IUser,
    company: ICompany,
    params: any
}): Promise<{ fullPath: string, incomeReport: IIncomeReportResponse }> => {

    let incomeReport: IIncomeReportResponse;
    let reportType: string;

    if (params.reportSource === ReportSources.JOB) {
        reportType = 'Completed Jobs (Invoiced)';
    }

    // Generate the income report based on which that requests by user
    switch (params.reportData) {
    case ReportData.CUSTOM:
        incomeReport = await _customIncomeReport(company._id, params);
        break;

    case ReportData.STANDARD:
    default:
        incomeReport = await _standardIncomeReport(company._id, params);
        break;
    }

    const fonts = {
        Roboto: {
            normal: `${INVOICE_FONT_PATH}/Roboto-Regular.ttf`,
            bold: `${INVOICE_FONT_PATH}/Roboto-Medium.ttf`,
            italics: `${INVOICE_FONT_PATH}/Roboto-Thin.ttf`,
            bolditalics: `${INVOICE_FONT_PATH}/Roboto-MediumItalic.ttf`,
        }
    };

    // Initialize PDF Make
    const pdfMake = new pdfmake(fonts);
    const generatePdf = await _handleReportPdf({ company, user, startDate: params.startDate, endDate: params.endDate, incomeReport, reportType });

    const fullPath = `${INCOME_REPORT_PDF_PATH}/${Date.now()}.pdf`;
    return new Promise((resolve) => {
        // Check if folder path exist, create if not
        if (!fs.existsSync(INCOME_REPORT_PDF_PATH)) {
            fs.mkdirSync(INCOME_REPORT_PDF_PATH);
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
        return { fullPath, incomeReport };
    });
};

const _handleReportPdf = async ({
    company,
    incomeReport,
    user,
    reportType,
    startDate,
    endDate
}: {
    company: ICompany,
    incomeReport: IIncomeReportResponse,
    user: IUser,
    reportType: string,
    startDate: string,
    endDate: string
}): Promise<any> => {

    // Construct Company Address object
    const companyAddress = {
        street: company.address?.street ? `${company.address?.street}` : '',
        city: company.address?.city ? `, ${company.address?.city}` : '',
        state: company.address?.state ? `, ${company.address?.state}` : '',
        zipCode: company.address?.zipCode ? `, ${company.address?.zipCode}` : '',
    };

    // Construct default Company Logo image
    let companyImage: any = {
        text: '',
        fillColor: '#cccccc'
    };

    let companyLogoFilePath = '';

    if (company.info?.logoUrl) {
        // Check and download Company Logo to /tmp file
        companyLogoFilePath = await downloadFileToPath(company, company.info.logoUrl, INVOICE_IMAGE_PATH, false);

        companyImage = {
            image: 'companyLogo',
            width: 67,
            height: 52,
        };
    }

    // Construct the header for the Invoice Items
    const table: any = {
        headerRows: 1,
        widths: [44, 202, 40, 86, 40, 86, 35],
        body: [],
    };

    // Add Invoice's Items to table template
    const bodyTable: any = [];
    if (incomeReport?.customers?.length) {
        for (const customer of incomeReport.customers) {
            const customerName = [{ text: ' ', style: 'lineFontBold', alignment: 'right' }, { text: `${customer.customer?.profile?.displayName ?? ''}`, style: 'lineFontBold', alignment: 'left' }];
            const incomeTotal = [{ text: ' ', style: 'lineFontBold', alignment: 'right' }, { text: `${delimiterEnUs(customer.total)}`, style: 'lineFont', alignment: 'right' }];
            bodyTable.push([
                {},
                customerName,
                {},
                {},
                {},
                incomeTotal,
                {}
            ]);
        }
    }

    bodyTable.push([{}, {}, {}, {}, {}, {}, {}]);
    for (let i = 0; i < bodyTable.length; i++) {
        table.body.push(bodyTable[i]);
    }

    // INITIALIZE PDF TEMPLATE
    const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [0, 0, 70, 30],
        footer: {
            columns: [
                [{
                    alignment: 'right',
                    text: ['Report generated by ', { text: user.profile?.displayName, style: 'smallFontBold' }, ' at ', { text: moment(new Date()).format('MMM. DD, YYYY'), style: 'smallFontBold' }],
                    style: 'smallFont'
                }],
            ],
            margin: [0, 0, 40, 0]
        },
        content: [
            {
                table: {
                    headerRows: 1,
                    widths: [48, 67, 100, 100, 203, 73],
                    body: [
                        [{}, {}, {}, {}, {}, {}],
                        [
                            {},
                            companyImage,
                            [{
                                text: `${company.info?.companyName}`,
                                fontSize: 8,
                                alignment: 'left',
                                bold: true,
                            }, {
                                text: `\n${company.contact?.phone ?? ''}\n${company.info?.companyEmail ?? ''}\n${companyAddress.street}${companyAddress.city}${companyAddress.state}${companyAddress.zipCode}`,
                                style: 'defaultFont',
                            }],
                            {},
                            [{
                                text: 'Generated From',
                                style: 'smallFont',
                                alignment: 'right'
                            }, {
                                text: `${reportType ?? 'Income'}`,
                                style: 'defaultFont',
                                alignment: 'right'
                            }],
                            {}
                        ],
                        [{}, {}, {}, {}, {}, {}],
                    ],
                },
                fillColor: '#EAECF3',
                layout: 'noBorders'
            },
            {
                //   layout: 'lightHorizontalLines', // optional
                table: {
                    // headers are automatically repeated if the table spans over multiple pages
                    // you can declare how many rows should be treated as headers
                    headerRows: 2,
                    widths: [48, 85, 110, 70, 63, 50, 74, 70],
                    body: [

                        [{}, {}, {}, {}, {}, {}, {}, {}],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                        [
                            {},
                            {
                                //   border: [false, false, false, false],
                                text: 'REVENUE FROM',
                                style: 'smallFont',
                            },
                            {
                                text: 'PERIOD',
                                style: 'smallFont',
                                alignment: 'left'
                            },
                            {},
                            {},
                            { text: 'TOTAL REVENUE', style: 'defaultFont', colSpan: 2, alignment: 'right' },
                            {},
                            {}
                        ],
                        [
                            {},
                            {
                                text: 'Income', style: 'defaultFont', alignment: 'left'
                            },
                            {
                                text: !(startDate && endDate) ? 'All Time' : `${moment(startDate).format('MMM. DD, YYYY')} - ${moment(endDate).format('MMM. DD, YYYY')}`,
                                style: 'defaultFont',
                                alignment: 'left',
                            },
                            {},
                            {},
                            { text: `${delimiterEnUs(incomeReport.totalIncome)}`, fontSize: 14, bold: true, colSpan: 2, rowSpan: 2, alignment: 'right' },
                            {},
                            {}
                        ],
                        [{}, [{}, {}, {}], [{}, {}], {}, {}, {}, {}, {}],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                    ],
                },
                fillColor: '#EAECF3',
                layout: 'noBorders'
            },

            {
                table: {
                    // headers are automatically repeated if the table spans over multiple pages
                    // you can declare how many rows should be treated as headers
                    headerRows: 2,
                    widths: [48, 85, 110, 70, 63, 50, 74, 70],
                    body: [
                        [
                            {},
                            [{
                                //   border: [false, false, false, false],
                                text: 'INVOICED',
                                style: 'smallFont',
                            }, {
                                text: `${delimiterEnUs(incomeReport.totalIncome)}`, style: 'lineFontBold', align: 'left'
                            }],
                            [{
                                text: 'CUSTOMERS',
                                style: 'smallFont',
                                alignment: 'left',
                            }, {
                                text: `${incomeReport.customerCount}`,
                                style: 'lineFontBold',
                                alignment: 'left',
                            }],
                            [{
                                text: 'JOBS',
                                style: 'smallFont',
                                alignment: 'left'

                            }, {
                                text: `${incomeReport.jobCount}`,
                                style: 'lineFontBold',
                                alignment: 'left',
                            }],
                            {}, {}, {}, {}
                        ],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                    ],
                },
                layout: {
                    hLineWidth: function (i: number, node: { table: { body: string | any[]; }; }) {
                        return i === 0 || i === node.table.body.length ? 0 : 1;
                    },
                    vLineWidth: function (i: number, node: { table: { widths: string | any[]; }; }) {
                        return i === 0 || i === node.table.widths.length ? 0 : 1;
                    },
                    vLineColor: function (i: number, node: { table: { widths: string | any[]; }; }) {
                        return i === 0 || i === node.table.widths.length ? 'black' : 'white';
                    },
                    hLineColor: function (i: number, node: { table: { body: string | any[]; }; }) {
                        return i === 0 || i === node.table.body.length
                            ? '#d0d3dc'
                            : '#eeeeee';
                    },
                },
            },
            {
                table,
                layout: {
                    hLineWidth: function (i: number, node: { table: { body: string | any[]; }; }) {
                        return i === 0 || i === node.table.body.length ? 0 : 1;
                    },
                    vLineWidth: function (i: number, node: { table: { widths: string | any[]; }; }) {
                        return i === 0 || i === node.table.widths.length ? 0 : 1;
                    },
                    vLineColor: function (i: number, node: { table: { widths: string | any[]; }; }) {
                        return i === 0 || i === node.table.widths.length ? 'black' : 'white';
                    },
                    hLineColor: function (i: number, node: { table: { body: string | any[]; }; }) {
                        return i === 0 || i === node.table.body.length
                            ? '#d0d3dc'
                            : '#eeeeee';
                    },
                },
            }
        ],
        styles: {
            header: {
                fontSize: 18,
                bold: true,
            },
            bigger: {
                fontSize: 15,
                italics: true,
            },
            subheader: {
                fontSize: 15,
                bold: true,
            },
            quote: {
                italics: true,
            },
            smallFont: {
                italics: true,
                fontSize: 7,
                lineHeight: 1.2,
            },
            smallFontBold: {
                bold: true,
                italics: true,
                fontSize: 7,
                lineHeight: 1.2,
            },
            defaultFont: {
                bold: false,
                fontSize: 8,
                weight: 100,
                lineHeight: 1.2,
            },
            defaultFontBold: {
                bold: true,
                fontSize: 8,
                weight: 100,
                lineHeight: 1.2,
            },
            lineFont: {
                bold: false,
                fontSize: 10,
                weight: 100,
                lineHeight: 1.2,
            },
            lineFontBold: {
                bold: true,
                fontSize: 10,
                weight: 100,
                lineHeight: 1.2,
            },
            tableFont: {
                bold: false,
                fontSize: 16,
                weight: 100,
                lineHeight: 1.2,
            },
            tableHeader: {
                bold: true,
                fontSize: 13,
                color: 'black',
            },
        },
        defaultStyle: {
            columnGap: 10,
            font: 'Roboto',
        },
        images: {
            companyLogo: companyLogoFilePath
        },
    };

    return docDefinition;
};
