import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { roundTwoDecimal } from '../services/helper';
import { Customer } from '../models/Customer';
import { Invoice } from '../models/Invoice';

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
