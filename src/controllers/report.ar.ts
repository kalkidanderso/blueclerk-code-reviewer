import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import fs from 'fs';
import pdfmake from 'pdfmake';
import * as _ from 'lodash';

import { FONT_SETS, ACCOUNT_RECEIVABLE_REPORT_PDF_PATH } from '../common/config';
import { Layouts, Styles } from '../common/constants.pdf';
import { delimiterEnUs, roundTwoDecimal } from '../services/helper';

import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { Customer } from '../models/Customer';
import { Invoice } from '../models/Invoice';
import { AgingBuckets, IAccountReceivableReportResponse, ReportData } from '../models/Report';

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
    }

}

/**
 * Generate custom account receivable report,
 * return the total unpaid and aging buckets,
 * and each customer's total unpaid
 */
export const _customAccountReceivableReport = async (companyId: string, params: any) => {

    let customerAgingBuckets: any[] = [];
    let customers;

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

    // Get the dates for aging bucket
    const aging91overDate = moment.utc(params.asOf).subtract(91, 'days').endOf('day').format();
    const aging6190Date = moment.utc(params.asOf).subtract(61, 'days').endOf('day').format();
    const aging3160Date = moment.utc(params.asOf).subtract(31, 'days').endOf('day').format();
    const aging130Date = moment.utc(params.asOf).subtract(1, 'days').endOf('day').format();
    const agingCurrentDate = moment.utc(params.asOf).startOf('day').format();

    // To get invoice's total if no balanceDue found for old invoices
    const balanceDue = { $ifNull: ['$balanceDue', '$total', 0] };

    // Get the list of customer that included on the A/R report
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
                            vars: { dueDate: "$dueDate" },
                            in: {
                                $switch: {
                                    branches: [
                                        { case: { $lte: ['$$dueDate', new Date(aging91overDate)] }, then: '91 and Over Past Due' },
                                        { case: { $lte: ['$$dueDate', new Date(aging6190Date)] }, then: '61 - 90' },
                                        { case: { $lte: ['$$dueDate', new Date(aging3160Date)] }, then: '31 - 60' },
                                        { case: { $lte: ["$$dueDate", new Date(aging130Date)] }, then: '1 - 30' },
                                        { case: { $gte: ["$$dueDate", new Date(agingCurrentDate)] }, then: 'Current' },
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
        const existingCustAB = customerAgingBuckets.find(customerAB => customerAB?.customer._id?.toString() === customerInvoice?._id?.customer?.toString());

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

}

/**
 * Generate basic account receivable report,
 * where only return the total unpaid and aging buckets
 */
const _generateAccountReceivableReport = async (companyId: string, params: any) => {

    // Construct the basic filter query
    const query: any = {
        company: new ObjectId(companyId),
        paid: { $ne: true },
        isDraft: { $ne: true },
        isVoid: { $ne: true }
    };

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

    // Aging bucket current (-999 to 0)
    const agingCurrent = await _getAgingBucket({ id: 1, label: 'Current', asOf, end: 0, query });

    // Aging bucket 1 to 30
    const aging130 = await _getAgingBucket({ id: 2, label: '1 - 30', asOf, start: 1, end: 30, query });

    // Aging bucket 31 to 60
    const aging3160 = await _getAgingBucket({ id: 3, label: '31 - 60', asOf, start: 31, end: 60, query });

    // Aging bucket 61 to 90
    const aging6190 = await _getAgingBucket({ id: 4, label: '61 - 90', asOf, start: 61, end: 90, query });

    // Aging bucket over 91
    const aging91over = await _getAgingBucket({ id: 5, label: '91 and Over Past Due', asOf, start: 91, query });

    // To get invoice's total if no balanceDue found for old invoices
    const balanceDue = { $ifNull: ['$balanceDue', '$total'] };

    // Get the total unpaid based on filter
    const totalUnpaidAggregate = await Invoice.aggregate([
        { $match: { ...query } },
        {
            $group: {
                _id: { company: '$company' },
                totalUnpaid: { $sum: balanceDue }
            }
        }
    ]);

    return {
        customerIds,
        query,
        totalUnpaid: roundTwoDecimal(totalUnpaidAggregate[0]?.totalUnpaid),
        agingCurrent,
        aging130,
        aging3160,
        aging6190,
        aging91over
    };

}

/**
 * To get the aging bucket by the given params
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

}

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
        return { fullPath, accountReceivableReport }
    })

}

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
    let asOf = params.asOf ? params.asOf : moment().format("YYYY-MM-DD");
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
        widths: [55, 165, 60, 60, 60, 60, 60, 55],
        height: 10,
        body: [],
    }

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
            {}
        ]);

        /**
         * Iterate all customer aging buckets,
         * and push them to the customer aging table
         */
        for (const customerAgingBucket of accountReceivableReport?.customerAgingBuckets) {
            const customer = customerAgingBucket?.customer;
            const customerAging = customerAgingBucket?.agingBuckets;

            const customerName = { text: `${customer?.profile?.displayName ?? ''}`, style: 'lineFontBold' };
            const agingCurrent = { text: `$${delimiterEnUs(customerAging?.find(ab => ab.label === AgingBuckets.CURRENT)?.totalUnpaid)}`, style: 'lineFontGrayBold' };
            const aging130 = { text: `$${delimiterEnUs(customerAging?.find(ab => ab.label === AgingBuckets.AGING_1_30)?.totalUnpaid)}`, style: 'lineFontGrayBold' };
            const aging3160 = { text: `$${delimiterEnUs(customerAging?.find(ab => ab.label === AgingBuckets.AGING_31_60)?.totalUnpaid)}`, style: 'lineFontGrayBold' };
            const aging6190 = { text: `$${delimiterEnUs(customerAging?.find(ab => ab.label === AgingBuckets.AGING_61_90)?.totalUnpaid)}`, style: 'lineFontGrayBold' };
            const aging91over = { text: `$${delimiterEnUs(customerAging?.find(ab => ab.label === AgingBuckets.AGING_91_OVER)?.totalUnpaid)}`, style: 'lineFontGrayBold' };

            bodyTable.push([
                {},
                customerName,
                agingCurrent,
                aging130,
                aging3160,
                aging6190,
                aging91over,
                {}
            ]);
        }
    }

    bodyTable.push([{}, {}, {}, {}, {}, {}, {}, {}]);
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
                    widths: [44, 352, 120, 44],
                    body: [
                        [
                            {},
                            {
                                text: `${company.info?.companyName?.toUpperCase()}`,
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
                    widths: [44, 100, 263, 100, 44],
                    body: [
                        [
                            {},
                            { text: 'As Of', style: 'smallFont' },
                            { text: 'Customer(s)', style: "smallFont", },
                            { text: 'TOTAL OUTSTANDING', style: 'smallFontGray', alignment: 'right' },
                            {}
                        ],
                        [
                            {},
                            { text: `${asOf}`, style: 'reportFilter' },
                            { text: `${customerNamesStr}`, style: 'reportFilter' },
                            { text: `$${delimiterEnUs(accountReceivableReport.totalUnpaid)}`, style: 'totalOutstanding', margin: [0, 0, 0, 20] },
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
                    widths: [44, 94, 94, 94, 94, 94, 44],
                    body: [
                        [
                            {},
                            [
                                { text: `${AgingBuckets.CURRENT}`, style: 'globalAgingTitle', },
                                { text: `$${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.agingCurrent?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            [
                                { text: `${AgingBuckets.AGING_1_30}`, style: 'globalAgingTitle' },
                                { text: `$${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.aging130?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            [
                                { text: `${AgingBuckets.AGING_31_60}`, style: 'globalAgingTitle' },
                                { text: `$${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.aging3160?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            [
                                { text: `${AgingBuckets.AGING_61_90}`, style: 'globalAgingTitle' },
                                { text: `$${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.aging6190?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
                            ],
                            [
                                { text: `${AgingBuckets.AGING_91_OVER}`, style: 'globalAgingTitle' },
                                { text: `$${delimiterEnUs(accountReceivableReport.globalAgingBuckets?.aging91over?.totalUnpaid)}`, style: 'globalAgingOutstanding' }
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
                    widths: [44, 387, 85, 44],
                    body: [
                        [
                            {},
                            {
                                text: `Generated for ${company.info?.companyName} by ${user.profile?.displayName} on ${moment(new Date()).format('MMM. DD, YYYY, hh:mm A')}`,
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
                layout: { ...Layouts.noBorders, },
            }]
        },
        styles: Styles.default,
        defaultStyle: {
            columnGap: 10,
            font: 'Roboto',
        },
    };

    return docDefinition;

}
