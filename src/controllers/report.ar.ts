import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Invoice } from '../models/Invoice';
import { roundTwoDecimal } from '../services/helper';

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
        aging91over
    }

}

/**
 * Generate custom account receivable report,
 * return the total unpaid and aging buckets,
 * and each customer's total unpaid
 */
export const _customAccountReceivableReport = async (companyId: string, params: any) => {
    // TODO: Custom A/R report
}

/**
 * Generate basic account receivable report,
 * where only return the total unpaid and aging buckets
 */
const _generateAccountReceivableReport = async (companyId: string, params: any) => {

    let asOf = params.asOf ? params.asOf : new Date();
    asOf = moment.utc(asOf).endOf('day').format();

    const query: any = {
        company: new ObjectId(companyId),
        paid: { $ne: true },
        isDraft: { $ne: true },
        isVoid: { $ne: true }
    };

    // TODO: params customer ids
    // if (params.customerIds) {
    //     const customerIds = [];
    //     for (const customerId of JSON.parse(params.customerIds)) {
    //         if (ObjectId.isValid(customerId)) {
    //             customerIds.push(new ObjectId(customerId));
    //         }
    //     }
    //     query.customer = { $in: customerIds };
    // }

    // Aging bucket current (-999 to 0)
    const agingCurrent = await _getAgingBucket({ id: 1, label: 'current', asOf, end: 0, query });

    // Aging bucket 1 to 30
    const aging130 = await _getAgingBucket({ id: 2, label: '1 - 30', asOf, start: 1, end: 30, query });

    // Aging bucket 31 to 60
    const aging3160 = await _getAgingBucket({ id: 3, label: '31 - 60', asOf, start: 31, end: 60, query });

    // Aging bucket 61 to 90
    const aging6190 = await _getAgingBucket({ id: 4, label: '61 - 90', asOf, start: 61, end: 90, query });

    // Aging bucket over 91
    const aging91over = await _getAgingBucket({ id: 5, label: '90 and Over Past Due', asOf, start: 91, query });

    // Get the total unpaid based on filter
    const totalUnpaidAggregate = await Invoice.aggregate([
        { $match: { ...query } },
        {
            $group: {
                _id: { company: '$company' },
                totalUnpaid: { $sum: '$balanceDue' }
            }
        }
    ]);

    return {
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

    const agingBucketAggregate = await Invoice.aggregate([
        { $match: { ...agingQuery } },
        {
            $group: {
                _id: { company: '$company' },
                totalUnpaid: { $sum: '$balanceDue' }
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
