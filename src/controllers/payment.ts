import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import * as _ from 'lodash';
import { roundTwoDecimal } from '../services/helper';

import { Status, Messages, InvoiceStatus, payrollPaymentTypes } from '../common/constants';
import { Company, ICompany } from '../models/Company';
import { IUser, User } from '../models/User';
import { Invoice, IInvoice } from '../models/Invoice';
import { Payment, IPayment, PaymentVendor, PaymentEmployee, PaymentCustomer, IPaymentVendor, IPaymentEmployee, IJobExportQuery } from '../models/Payment';
import { Customer, ICustomer } from '../models/Customer';
import { _checkQBCustomerJobLocation } from '../controllers/quickbook.customer';
import { _createQBPayment, _deleteQBPayment, _updateQBPayment, _voidPayment } from './quickbook.payment';
import { IInvoiceCommission, InvoiceCommission } from '../models/InvoiceCommission';
import { AdvancePayment, AdvancePaymentEmployee, AdvancePaymentVendor } from '../models/AdvancePayment';
import * as Sentry from '@sentry/node';
import { IJob, Job } from '../models/Job';
import { IJobCommission, JobCommission } from '../models/JobCommission';
import { logType } from 'src/models/invoiceLogs';
import * as InvoiceLogController from '../controllers/invoiceLogs';


/**
 * Data returned by the query that gets technian commissions linked to the invoices
 */
interface ITechnicianCommissionInvoice {
    technician: ObjectId
    contractor?: ObjectId
    commission: number
    commissionAmount: number
    paid?: boolean
    paidAt?: Date
    invoice: {
        id: ObjectId,
        workType: ObjectId,
        companyLocation: ObjectId
    }
}

/**
 * Data returned by the query that gets technian commissions linked to the jobs
 */
interface ITechnicianCommissionJob {
    technician: ObjectId
    contractor?: ObjectId
    commission: number
    commissionAmount: number
    paid?: boolean
    paidAt?: Date
    job: {
        id: ObjectId,
        workType: ObjectId,
        companyLocation: ObjectId
    }
}

interface IJobExcelRow {
    jobNumber?: string;
    date?: string;
    subdivision?: string;
    jobAdress?: string;
    amount?: string;
    techName?: string;
}

/**
 * To calculate invoice and customer payment amount related,
 * invoice's balanceDue, paymentApplied, status, and paid,
 * customer's balance and credit
 */
export const _calculateInvoiceBalance = async (invoice: IInvoice, customer: ICustomer, amountPaid: number): Promise<void> => {

    // Check and set invoice balanceDue if not found
    invoice.balanceDue = invoice.balanceDue ?? (invoice.total - invoice.paymentApplied) ?? invoice.total;

    // Handle invoice balance due, underpayment, and overpayment
    if (amountPaid >= invoice.balanceDue) {
        /**
         * This will handle overpayment/exact payment
         */

        // Deduct the customer balance
        customer.balance -= invoice.balanceDue;
        // Add on the customer credit if any
        customer.credit += (amountPaid - invoice.balanceDue);

        // Update invoice paymentApplied, balanceDue, and status
        invoice.paymentApplied += invoice.balanceDue;
        invoice.balanceDue = 0;
        invoice.status = InvoiceStatus.PAID;
        invoice.paid = true;
    } else {
        /**
         * This will handle underpayment
         */

        // Deduct the customer balance
        customer.balance -= amountPaid;

        // Fix default paymentApplied and balanceDue for old invoice
        invoice.paymentApplied = invoice.paymentApplied ?? 0;
        invoice.balanceDue = invoice.balanceDue ?? invoice.total;

        // Update invoice paymentApplied, balanceDue, and status
        invoice.paymentApplied += amountPaid;
        invoice.balanceDue -= amountPaid;
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
        invoice.paid = false;

        if (invoice.paymentApplied === 0) {
            invoice.status = InvoiceStatus.UNPAID;
        }
    }

    // Round the numbers
    customer.balance = roundTwoDecimal(customer.balance);
    invoice.balanceDue = roundTwoDecimal(invoice.balanceDue);
    invoice.paymentApplied = roundTwoDecimal(invoice.paymentApplied);

    // Save the customer's changes
    await customer.save();
    // Save the invoice's changes
    await invoice.save();

    return;

};

/**
 * To reset Payment quickbookId,
 * used when /disconnectQB API called
 */
export const _resetPaymentQB = (company: ICompany): void => {

    Payment.updateMany(
        { company: company._id, quickbookId: { $ne: null } },
        { $set: { quickbookId: null } }
    ).exec();

    return;

};

export const getPayments = (req: Request, res: Response) => {
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;

    const filterQuery: { [key: string]: any } = { company: req.companyId, __t: { $nin: ['PaymentEmployee', 'PaymentVendor'] } };
    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        filterQuery['workType'] = { $in: workTypeIds };
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        filterQuery['companyLocation'] = { $in: companyLocationIds };
    }
    Payment.find(filterQuery)
        .populate({
            path: 'company',
            select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address contact contactName vendorId'
        })
        .populate({
            path: 'invoice',
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
        })
        .populate({
            path: 'line.invoice',
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName auth.email'
        })
        .populate({
            path: 'companyLocation',
            select: 'billingAddress name isMainLocation'
        })
        .populate({
            path: 'workType',
            select: 'title'
        })
        .then(async (payments: IPayment[] | null) => {

            // Retrieve number of the unsynced invoices
            const filterUnsynced: any = {};
            if (workType) {
                let workTypeIds: any[] = [];
                try {
                    const workTypeArr = JSON.parse(workType);
                    workTypeIds = workTypeArr.map((id: string) => {
                        if (ObjectId.isValid(id)) return new ObjectId(id);
                    });
                } catch (error) { }
                filterUnsynced['workType'] = { $in: workTypeIds };
            }
            if (companyLocation) {
                let companyLocationIds: any[] = [];
                try {
                    const companyLocationArr = JSON.parse(companyLocation);
                    companyLocationIds = companyLocationArr.map((id: string) => {
                        if (ObjectId.isValid(id)) return new ObjectId(id);
                    });
                } catch (error) { }
                filterUnsynced['companyLocation'] = { $in: companyLocationIds };
            }

            const unsyncedPayments = await Payment.find({
                company: req.companyId,
                __t: { $nin: ['PaymentEmployee', 'PaymentVendor'] },
                isVoid: { $ne: true },
                quickbookId: null,
                ...filterUnsynced
            })?.countDocuments();

            return res.json({ status: Status.Success, unsyncedPayments, payment: payments });
        })
        .catch((error: any) => {
            Sentry.captureException(error);
            if (error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message });
            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }
        });

};

/**
 * To retrieve unsynced payments that active
 */
export const getUnsyncedPayments = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;

    // Data query that used to search unsynced Invoices
    const filterQuery: any = {
        $and: [
            { company: companyId },
            { __t: { $nin: ['PaymentEmployee', 'PaymentVendor'] } },
            { isVoid: { $ne: true } },
            { quickbookId: null }
        ]
    };

    // Check and add if params filter provided
    if (params.keyword) {
        const keywordRegex = { $regex: params.keyword, $options: 'i' };
        filterQuery['$and'].push({
            $or: [
                { referenceNumber: keywordRegex },
                { paymentType: keywordRegex },
                { 'invoice.invoiceId': keywordRegex },
                { 'invoice.customerPO': keywordRegex },
                { 'line.invoice.invoiceId': keywordRegex },
                { 'line.invoice.customerPO': keywordRegex },
            ]
        });
    }
    if (params.customerId) {
        filterQuery['$and'].push({ customer: new ObjectId(params.customerId) });
    }

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        filterQuery['$and'].push({ workType: { $in: workTypeIds } });
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        filterQuery['$and'].push({ companyLocation: { $in: companyLocationIds } });
    }

    const payments = await Payment.find(filterQuery)
        .populate({
            path: 'company',
            select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address contact contactName vendorId'
        })
        .populate({
            path: 'invoice',
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
        })
        .populate({
            path: 'line.invoice',
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName auth.email'
        });

    return res.json({
        status: Status.Success,
        total: payments.length,
        payments
    });

};

export const getPaymentsByCustomerId = (req: Request, res: Response) => {

    const params = req.query;

    Payment.find({ company: req.companyId, customer: new ObjectId(params.customerId) })
        .populate({
            path: 'company',
            select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address contact contactName vendorId'
        })
        .populate({
            path: 'invoices',
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
        })
        .populate({
            path: 'invoice',
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
        })
        .populate({
            path: 'line.invoice',
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName auth.email'
        })
        .then((payments: IPayment[] | null) => {

            return res.json({ 'status': Status.Success, 'payment': payments });
        })
        .catch((error: any) => {
            Sentry.captureException(error);
            if (error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message });
            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }
        });

};

export const getPaymentsByContractor = async (req: Request, res: Response) => {

    let query;
    let voidQuery;
    let result;
    const params = req.query;
    const company = <ICompany>req.company;
    const payrollPaymentType = params.payrollPaymentType;
    const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;

    const filterByDivision: any = {};

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        filterByDivision['workType'] = { $in: workTypeIds };
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        filterByDivision['companyLocation'] = { $in: companyLocationIds };
    }

    if (params.startDate && params.endDate) {
        query = { paidAt: { $gte: startDate, $lte: endDate } };
    }

    switch (params.isActive) {
    case 'active':
        voidQuery = { isVoid: { $ne: true } };
        break;

    case 'void':
        voidQuery = { isVoid: true };
        break;

    default:
        voidQuery = {};
        break;
    }

    switch (params.type) {
    case 'vendor':
        result = _.extend({ status: Status.Success });
        const vendorQuery = { company: company._id, contractor: params.id, ...query, ...voidQuery, ...filterByDivision };
        if (payrollPaymentType === payrollPaymentTypes.PayrollPayments || payrollPaymentType !== payrollPaymentTypes.AdvancePayments) {
            const payments = await PaymentVendor.find(vendorQuery)
                .populate({
                    path: 'company',
                    select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
                })
                .populate({
                    path: 'contractor',
                    select: 'info address contact',
                    populate: [{ path: 'admin', select: 'profile auth.email contact' }]
                })
                .populate({
                    path: 'invoices',
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });
            result = _.extend(result, { payments });
        }

        if (payrollPaymentType == payrollPaymentTypes.AdvancePayments || payrollPaymentType !== payrollPaymentTypes.PayrollPayments) {
            const advancePayments = await AdvancePaymentVendor.find(vendorQuery)
                .populate({
                    path: 'company',
                    select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
                })
                .populate({
                    path: 'contractor',
                    select: 'info address contact',
                    populate: [{ path: 'admin', select: 'profile auth.email contact' }]
                })
                .populate({
                    path: 'invoices',
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });
            result = _.extend(result, { advancePayments });
        }
        return res.json(result);

    case 'employee':
        result = _.extend({ status: Status.Success });
        const employeeQuery = { company, employee: params.id, ...query, ...voidQuery, ...filterByDivision };
        if (payrollPaymentType === payrollPaymentTypes.PayrollPayments || payrollPaymentType !== payrollPaymentTypes.AdvancePayments) {
            const payments = await PaymentEmployee.find(employeeQuery)
                .populate({
                    path: 'company',
                    select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
                })
                .populate({
                    path: 'employee',
                    select: 'profile auth.email address contact'
                })
                .populate({
                    path: 'invoices',
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });
            result = _.extend(result, { payments });
        }

        if (payrollPaymentType == payrollPaymentTypes.AdvancePayments || payrollPaymentType !== payrollPaymentTypes.PayrollPayments) {
            const advancePayments = await AdvancePaymentEmployee.find(employeeQuery)
                .populate({
                    path: 'company',
                    select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
                })
                .populate({
                    path: 'employee',
                    select: 'profile auth.email address contact'
                })
                .populate({
                    path: 'invoices',
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });
            result = _.extend(result, { advancePayments });
        }
        return res.json(result);

    default:
        result = _.extend({ status: Status.Success });
        if (payrollPaymentType === payrollPaymentTypes.PayrollPayments || payrollPaymentType !== payrollPaymentTypes.AdvancePayments) {
            const payments = await Payment.find({ company: company._id, __t: { $in: ['PaymentVendor', 'PaymentEmployee'] }, ...query, ...voidQuery, ...filterByDivision })
                .populate({
                    path: 'company',
                    select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
                })
                .populate({
                    path: 'contractor',
                    select: 'info address contact',
                    populate: [{ path: 'admin', select: 'profile auth.email contact' }]
                })
                .populate({
                    path: 'employee',
                    select: 'profile auth.email address contact'
                })
                .populate({
                    path: 'invoices',
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });
            result = _.extend(result, { payments });
        }

        if (payrollPaymentType == payrollPaymentTypes.AdvancePayments || payrollPaymentType !== payrollPaymentTypes.PayrollPayments) {
            const advancePayments = await AdvancePayment.find({ company: company._id, __t: { $in: ['PaymentVendor', 'PaymentEmployee'] }, ...query, ...voidQuery, ...filterByDivision })
                .populate({
                    path: 'company',
                    select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
                })
                .populate({
                    path: 'contractor',
                    select: 'info address contact',
                    populate: [{ path: 'admin', select: 'profile auth.email contact' }]
                })
                .populate({
                    path: 'employee',
                    select: 'profile auth.email address contact'
                })
                .populate({
                    path: 'invoices',
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost customerPO vendorId note status paid balanceDue paymentApplied tax taxAmount subTotal total'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });
            result = _.extend(result, { advancePayments });
        }
        return res.json(result);
    }

};

/**
 * Create payment for single invoice
 */
export const createPayment = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    let paramInvoices = params.line ?? [];
    let invoice: any;

    if (!Array.isArray(paramInvoices)) {
        paramInvoices = JSON.parse(params.line);
    }

    if (params.invoiceId && paramInvoices.length || !params.invoiceId && !paramInvoices.length) {
        return res.json({ status: Status.Error, message: 'Either of invoiceId or line is required' });
    }

    // Find and check if customer existed
    const customer = await Customer.findOne({
        _id: params.customerId
    });

    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found.' });
    }

    const divisionData: any = {};
    if (params.invoiceId) {
        // Find and check if invoice existed and belongs to the customer
        invoice = await Invoice.findOne({
            _id: params.invoiceId,
            customer: customer._id,
            company: company._id,
            isVoid: { $ne: true }
        });

        if (!invoice || invoice.isDraft) {
            return res.json({ status: Status.Error, message: 'Invoice either not found, already voided, or does not belong to the customer.' });
        }
        if (invoice.status === InvoiceStatus.PAID) {
            return res.json({ status: Status.Success, message: 'Invoice already paid off.' });
        }

        if (invoice.companyLocation) {
            divisionData['companyLocation'] = invoice.companyLocation;
        }

        if (invoice.workType) {
            divisionData['workType'] = invoice.workType;
        }
    }

    if (paramInvoices.length) {
        const [ line ] = paramInvoices;

        const firstInvoice = await Invoice.findOne({
            _id: line.invoiceId,
            customer: customer._id,
            company: company._id,
            isVoid: { $ne: true }
        });

        if (firstInvoice.companyLocation) {
            divisionData['companyLocation'] = firstInvoice.companyLocation;
        }

        if (firstInvoice.workType) {
            divisionData['workType'] = firstInvoice.workType;
        }
    }

    // Construct payment entry
    const payment = new PaymentCustomer({
        customer,
        invoice,
        // referenceNumber: params.referenceNumber || new ObjectId().toString().substring(5, 20),
        referenceNumber: params.referenceNumber,
        paymentType: params.paymentType,
        paidAt: params.paidAt ? moment(params.paidAt).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        note: params.note,
        company,
        createdBy: user,
        createdAt: Date.now(),
        ...divisionData
    });

    try {
        let errorMessages = '';
        if (paramInvoices.length) {
            const errPayments: {[p: string]: string[]} = {};
            // Handle multiple invoices
            for (const paramInvoice of paramInvoices) {
                const resInvoices = await _handleMultipleInvoices(paramInvoice, payment, customer, company);
                
                if (resInvoices.error) {
                    if (errPayments[resInvoices.error]) {
                        errPayments[resInvoices.error].push(resInvoices.invoiceId?.replace('Invoice',''));
                    } else {
                        errPayments[resInvoices.error] = [resInvoices.invoiceId?.replace('Invoice','')];
                    }
                }
            }

            Object.keys(errPayments).forEach(err => {
                if (err == 'invoice_not_found') {
                    errorMessages += `The payment was recorded & Invoice with id ${errPayments[err].toString()} either not found, already voided, or does not belong to the customer.`;
                } else {
                    errorMessages += `The payment was recorded & Invoice with id ${errPayments[err].toString()} already paid off.`;
                }
            });
        } else {
            payment.amountPaid = params.amount;
            // Handle invoice balance due, underpayment, and overpayment
            await _calculateInvoiceBalance(invoice, customer, parseFloat(params.amount));

            const invoiceLogsObj:any={invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.PAYMENT_RECORDED, info:'Payment of $'+payment.amountPaid +' recorded', amountPaid:payment.amountPaid, customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company, createdBy: user._id};
            InvoiceLogController.create(invoiceLogsObj);

        }

        // Save the new payment
        payment.amountPaid = roundTwoDecimal(payment.amountPaid);
        await payment.save();

        const responseMessage = errorMessages ? errorMessages : 'Payment successfully created.';
        if (company.qbAuthorized) {
            /**
             * Check Customer & Job Locations data on QBooks,
             * if not found, create them on QBooks
             */
            _checkQBCustomerJobLocation(req, res, company, customer._id, (err, errMsg, qbCustomer) => {
                if (err || errMsg) {
                    return res.json({ status: Status.Success, message: responseMessage, payment, customer, invoice });
                }

                if (qbCustomer) {
                    // Create new Payment in QuickBooks
                    _createQBPayment(req, res, company, payment, async (err, errMsg, qbPayment) => {
                        if (err || errMsg) {
                            return res.json({ status: Status.Success, message: responseMessage, payment, quickbookPayment: null, quickbookPaymentError: errMsg, customer, invoice });
                        }

                        if (qbPayment) {
                            // Save quickbookId and our unique generated referenceNumber
                            payment.quickbookId = qbPayment.Id;
                            payment.quickbookRefNum = Buffer.from(qbPayment.MetaData?.CreateTime).toString('base64');
                            await payment.save();

                            // If company's payments already synced, update the synced date
                            if (company.qbSync?.paymentsSynced) {
                                company.qbSync.paymentsSyncedAt = new Date();
                                await company.save();
                            }
                        }

                        return res.json({
                            status: Status.Success,
                            message: responseMessage,
                            payment, quickbookPayment: qbPayment,
                            customer, invoice
                        });
                    });
                }
            });

        } else {

            return res.json({ status: Status.Success, message: responseMessage, payment, customer, invoice });
        }

    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
    }
};

export const createPaymentContractor = async (req: Request, res: Response) => {

    let jobQuery: any = {};
    let invoiceQuery: any = {};

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    const paramsInvoiceIds = params.invoiceIds?.length ? JSON.parse(params.invoiceIds) : [];
    const paramsJobIds = params.jobIds?.length ? JSON.parse(params.jobIds) : [];

    if (!params.invoiceIds && !params.jobIds && !params.startDate && !params.endDate) {
        return res.json({ statstus: Status.Error, message: 'Either invoiceIds, jobIds or startDate endDate is required.' });
    }

    // const startDate = moment(params.startDate).startOf('day').utc().format();
    // const endDate = moment(params.endDate).endOf('day').utc().format();
    const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();
    let creditUsed = params.creditUsed ?? 0;

    if (paramsInvoiceIds.length || paramsJobIds.length) {
        if(paramsJobIds.length) jobQuery = { _id: { $in: paramsJobIds } };
        if(paramsInvoiceIds.length) invoiceQuery = { _id: { $in: paramsInvoiceIds } };
    } else if (params.startDate && params.endDate) {
        jobQuery = { $or: [{ endTime: { $gte: startDate, $lte: endDate } }]};
        invoiceQuery = { $or: [{ issuedDate: { $gte: startDate, $lte: endDate } }] };
    } else {
        return res.json({ statstus: Status.Error, message: 'Either invoiceIds, JobIds or startDate endDate is required' });
    }

    let invoices: IInvoice[] = [];
    let jobs: IJob[] = [];

    if (Object.keys(invoiceQuery).length) {
        invoices = await Invoice.find({ ...invoiceQuery, isDraft: { $ne: true } }).populate({ path: 'commission' });
    }

    if (Object.keys(jobQuery).length) {
        jobs = await Job.find({ ...jobQuery, status: 2 }).populate({ path: 'commission' });
    }

    const invoiceIds = invoices.map(invoice => invoice._id);
    const jobIds = jobs.map(job => job._id);

    // Construct the base payment entry
    const paymentEntry: any = {
        invoices: invoiceIds,
        jobs: jobIds,
        amountPaid: roundTwoDecimal(params.amount),
        paymentType: params.paymentType,
        // referenceNumber: params.referenceNumber || new ObjectId().toString().substring(5, 20),
        referenceNumber: params.referenceNumber,
        startDate: params.startDate ? moment(params.startDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        endDate: params.endDate ? moment(params.endDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        offset: params.offset,
        paidAt: params.paidAt ? moment(params.paidAt).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        creditUsed,
        note: params.note,
        company,
        createdBy: user,
        createdAt: Date.now(),
    };

    if (params.companyLocation) {
        paymentEntry['companyLocation'] = params.companyLocation;
    }

    if (params.workType) {
        paymentEntry['workType'] = params.workType;
    }

    switch (params.type) {
    case 'vendor':
        // Check if vendor exist
        const contractor = await Company.findById(params.id).exec();
        if (!contractor) {
            return res.json({ status: Status.Error, message: 'Vendor not found' });
        }

        // Save the Payment Vendor entry
        const paymentVendor = await new PaymentVendor({
            contractor,
            ...paymentEntry
        }).save();

        if (creditUsed > 0) {
            // Deduct vendor credit
            const contractorCredit = (contractor.credit ?? 0) - creditUsed;
            contractor.credit = contractorCredit < 0 ? 0 : contractorCredit;

            // Deduct advance payment's balance
            // let creditUsed = params.creditUsed;
            const vendorAdvancePayments = await AdvancePayment.find({
                company: company._id,
                isVoid: { $ne: true },
                contractor: contractor._id,
                appliedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            });
                // Iterate advance payments and deduct their balance
            for (const advancePayment of vendorAdvancePayments) {
                if (creditUsed > advancePayment.balance) {
                    creditUsed -= advancePayment.balance;
                    advancePayment.balance = 0;
                } else {
                    advancePayment.balance -= creditUsed;
                    creditUsed = 0;
                }

                await advancePayment.save();

                if (creditUsed <= 0) {
                    break;
                }
            }
        }


        // Iterate all invoices to mark the commission as paid and deduct vendor balance
        for (const invoice of invoices) {
            const invoiceCommission = <IInvoiceCommission>invoice.commission;

            if (invoiceCommission.technicians) {
                // Find the vendor on the invoice commisison object
                const contractorInvoiceCommission = invoiceCommission.technicians.find(commission => commission?.contractor?.toString() === contractor?._id?.toString());

                // Mark vendor commission as paid
                contractorInvoiceCommission.paid = true;
                contractorInvoiceCommission.paidAt = paymentVendor.paidAt;

                // Deduct vendor balance
                const contractorBalance = contractor.balance - Number(contractorInvoiceCommission.commissionAmount.toFixed(2));
                contractor.balance = contractorBalance < 0 ? 0 : contractorBalance;

                await invoiceCommission.save();
            }
        }

        // Iterate all jobs to mark the commission as paid and deduct vendor balance
        for (const job of jobs) {
            const jobCommission = <IJobCommission>job.commission;

            if (jobCommission.technicians) {
                // Find the vendor on the invoice commisison object
                const contractorJobCommission = jobCommission.technicians.find(commission => commission?.contractor?.toString() === contractor?._id?.toString());

                // Mark vendor commission as paid
                contractorJobCommission.paid = true;
                contractorJobCommission.paidAt = paymentVendor.paidAt;

                // Deduct vendor balance
                const contractorBalance = contractor.balance - Number(contractorJobCommission.commissionAmount.toFixed(2));
                contractor.balance = contractorBalance < 0 ? 0 : contractorBalance;

                await jobCommission.save();
            }
        }
        await contractor.save();

        // Record payment for vendor is done, finish the request
        return res.json({ status: Status.Success, message: 'Payment successfully created.', payment: paymentVendor });

    case 'employee':
        // CHeck if employee exist
        const employee = await User.findById(params.id).exec();
        if (!employee) {
            return res.json({ status: Status.Error, message: 'Employee not found' });
        }

        // Save the Payment Employee entry
        const paymentEmployee = await new PaymentEmployee({
            employee,
            ...paymentEntry
        }).save();

        if (creditUsed > 0) {
            // Deduct employee credit
            const employeeCredit = (employee.credit ?? 0) - creditUsed;
            employee.credit = employeeCredit < 0 ? 0 : employeeCredit;

            // Deduct advance payment's balance
            // let creditUsed = params.creditUsed;
            const employeeAdvancePayments = await AdvancePayment.find({
                company: company._id,
                isVoid: { $ne: true },
                employee: employee._id,
                appliedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            });
                // Iterate advance payments and deduct their balance
            for (const advancePayment of employeeAdvancePayments) {
                if (creditUsed > advancePayment.balance) {
                    creditUsed -= advancePayment.balance;
                    advancePayment.balance = 0;
                } else {
                    advancePayment.balance -= creditUsed;
                    creditUsed = 0;
                }

                await advancePayment.save();

                if (creditUsed <= 0) {
                    break;
                }
            }
        }


        // Iterate all invoices to mark the commission as paid and deduct employee balance
        for (const invoice of invoices) {
            const invoiceCommission = <IInvoiceCommission>invoice.commission;

            if (invoiceCommission.technicians) {
                // Find the employee on the invoice commisison object
                const employeeInvoiceCommission = invoiceCommission.technicians.find(commission => commission?.technician?.toString() === employee?._id?.toString());

                // Mark employee commission as paid
                employeeInvoiceCommission.paid = true;
                employeeInvoiceCommission.paidAt = paymentEmployee.paidAt;

                // Deduct employee balance
                const employeeBalance = employee.balance - Number(employeeInvoiceCommission.commissionAmount.toFixed(2));
                employee.balance = employeeBalance < 0 ? 0 : employeeBalance;

                await invoiceCommission.save();
            }
        }
        await employee.save();

        // Record payment for employee is done, finish the request
        return res.json({ status: Status.Success, message: 'Payment successfully created.', payment: paymentEmployee });

    default:
        return res.json({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

};

export const createPaymentMultipleInvoices = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    let invoicesPaid: any = [];
    let invoiceIds: any = [];
    const invoiceWrongIds: any = [];

    if (params.invoices) {
        invoicesPaid = params.invoices.split(',');
    }
    if (invoicesPaid.length > 0) {
        invoiceIds = invoicesPaid.map((invoiceID: string) => {
            invoiceID = invoiceID.trim();

            // Check if invoiceID is a valid ObjectID
            if (ObjectId.isValid(invoiceID)) {
                return new ObjectId(invoiceID);
            } else {
                invoiceWrongIds.push(invoiceID);
            }
        });

        // Check if there any not valid invoiceIds
        if (invoiceWrongIds.length > 0) {
            return res.json({ status: Status.Error, message: `These invoiceIds are not a valid ObjectID: ${invoiceWrongIds}` });
        }
    }

    // Find and check if customer exist
    const customer = await Customer.findById(params.customerId);
    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found' });
    }

    const payment = new Payment({
        customer,
        amountPaid: roundTwoDecimal(params.amount),
        referenceNumber: params.referenceNumber,
        paymentType: params.paymentType,
        paidAt: params.paidAt ? new Date(params.paidAt) : Date.now(),
        company: req.companyId,
        createdBy: user._id,
        invoices: invoiceIds,
        createdAt: Date.now(),
    });

    try {
        // Save the new payment
        await payment.save();

        // Deduct the customer balance
        customer.balance -= payment.amountPaid;
        customer.balance = roundTwoDecimal(customer.balance);
        await customer.save();

        // Update all invoices status to paid=true
        await Invoice.updateMany({ _id: { $in: invoiceIds } }, { paid: true });

        return res.json({ status: Status.Success, message: 'Payment created successfully.' });

    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
    }

};

const updateInvoice = (invoice: IInvoice) => {
    return new Promise<void>((resolve, reject) => {
        invoice.update({ paid: true }, (err: any, res: any) => {
            if (err) {
                reject();
            }
            resolve();
        });
    });
};

/**
 * Update payment for single invoice
 */
export const updatePayment = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    const invoices: IInvoice[] = [];
    let paramsInvoices = params.line ?? [];

    if (!Array.isArray(paramsInvoices)) {
        paramsInvoices = JSON.parse(params.line);
    }

    // Find and check if customer existed
    const customer = await Customer.findOne({
        _id: params.customerId
    });

    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found.' });
    }

    // Find and check if payment existed and belongs to the customer
    const payment: any = await Payment.findOne({
        _id: params.paymentId,
        customer: customer._id,
        company: company._id
    })
        .populate({ path: 'invoice' })
        .populate({ path: 'customer' })
        .populate({ path: 'line.invoice' });

    if (!payment) {
        return res.json({ status: Status.Error, message: 'Payment not found or does not belong to the customer.' });
    }

    if (payment?.line.length && !paramsInvoices.length) {
        return res.json({ status: Status.Error, message: 'Line is required on this payment' });
    }

    const invoice = <IInvoice>payment.invoice;

    const updatedInvoices = paramsInvoices.map((elem:any) => elem.invoiceId);

    for (const line of payment.line) {
        if (!updatedInvoices.includes(line.invoice._id.toString())) {
            await _unpaidInvoice(line.invoice, payment.customer);
        }
    }

    payment.line = payment.line.filter((line :any) => {
        if (updatedInvoices.includes(line.invoice._id.toString())) {
            return line;
        } 
    });

    const oldAmountPaid = payment.amountPaid;
    let newAmountPaid, diffAmountPaid = 0;

    if (params.amount) {
        newAmountPaid = Number(params.amount);
        diffAmountPaid = newAmountPaid - oldAmountPaid;
    }

    payment.amountPaid = newAmountPaid ?? payment.amountPaid;
    payment.amountPaid = roundTwoDecimal(payment.amountPaid);
    payment.referenceNumber = params.referenceNumber ?? payment.referenceNumber;
    payment.paymentType = params.paymentType;
    payment.paidAt = params.paidAt ? new Date(moment(params.paidAt).format('YYYY-MM-DD')) : payment.paidAt;
    payment.note = params.note;
    payment.updatedBy = user;
    payment.updatedAt = new Date();

    try {
        if (payment?.line.length && paramsInvoices.length) {
            const invoiceLine = await _handleUpdateMultipleInvoices(paramsInvoices, payment, customer, company,oldAmountPaid);
            invoices.push(...invoiceLine);
        }

        // If amount changed, recalculate invoice & customer balance
        if (!paramsInvoices.length && newAmountPaid) {
            /**
             * If invoice full paid and the new amount still cover the whole invoice,
             * the deducted amount will only deduct customer's credit
             */
            if (invoice.balanceDue === 0 && diffAmountPaid < 0 && newAmountPaid >= invoice.total) {
                customer.credit += diffAmountPaid;
                customer.save();
            } else {
                // Otherwise, recalculate invoice & customer balance
                await _calculateInvoiceBalance(invoice, customer, diffAmountPaid);
            }

            const invoiceLogsObj:any={invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.PAYMENT_UPDATED, info:'Payment of $'+oldAmountPaid +' updated to $'+payment.amountPaid, amountPaid:payment.amountPaid, customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company, createdBy: payment.updatedBy};
            InvoiceLogController.create(invoiceLogsObj);

            invoices.push(invoice);
        }

        // Save the updated payment
        await payment.save();
      
        if (company.qbAuthorized && payment.quickbookId) {
            // Sync the update to Payment in QuickBooks
            _updateQBPayment(req, res, company, payment, async (err, errMsg, qbPayment) => {
                if (err || errMsg) {
                    return res.json({ status: Status.Success, message: 'Payment successfully updated.', payment, quickbookPayment: null, quickbookPaymentError: errMsg, customer, invoices });
                }

                if (qbPayment) {
                    // Save our unique generated referenceNumber
                    payment.quickbookRefNum = Buffer.from(qbPayment.MetaData?.CreateTime).toString('base64');
                    await payment.save();

                    // If company's payments already synced, update the synced date
                    if (company.qbSync?.paymentsSynced) {
                        company.qbSync.paymentsSyncedAt = new Date();
                        company.save();
                    }
                }

                return res.json({
                    status: Status.Success,
                    message: 'Payment successfully updated.',
                    payment, quickbookPayment: qbPayment,
                    customer, invoices
                });
            });
        } else {
            return res.json({ status: Status.Success, message: 'Payment successfully updated.', payment, quickbookPayment: null, quickbookPaymentError: 'Error in Company\'s QB authorization or Payment QB id', customer, invoice });
        }

    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
    }

};

export const updatePaymentContractor = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    let payment: IPayment;

    switch (params.type) {
    case 'vendor':
        const contractor = await Company.findById(params.id);
        if (!contractor) {
            return res.json({ status: Status.Error, message: 'Vendor not found.' });
        }

        payment = await PaymentVendor.findOne({
            _id: params.paymentId,
            contractor: contractor._id,
            company: company._id
        }).populate({ path: 'invoices' });

        if (!payment) {
            return res.json({ status: Status.Error, message: 'Payment not found or does not belong to the contractor.' });
        }
        break;

    case 'employee':
        const employee = await User.findById(params.id);
        if (!employee) {
            return res.json({ status: Status.Error, message: 'Employee not found.' });
        }

        payment = await PaymentEmployee.findOne({
            _id: params.paymentId,
            employee: employee._id,
            company: company._id
        }).populate({ path: 'invoices' });

        if (!payment) {
            return res.json({ status: Status.Error, message: 'Payment not found or does not belong to the employee.' });
        }
        break;

    default:
        return res.json({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

    payment.amountPaid = params.amount ? Number(params.amount) : payment.amountPaid;
    payment.amountPaid = roundTwoDecimal(payment.amountPaid);
    payment.referenceNumber = params.referenceNumber ?? payment.referenceNumber;
    payment.paymentType = params.paymentType ?? payment.paymentType;
    payment.paidAt = params.paidAt ? new Date(moment(params.paidAt).format('YYYY-MM-DD')) : payment.paidAt;
    payment.note = params.note;
    payment.updatedBy = user;
    payment.updatedAt = new Date();
    payment.save();

    return res.json({ status: Status.Success, payment });

};

export const updatePaymentMultipleInvoices = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    let previousDedeuctedBalance = 0;
    let invoicesPaid: any = [];
    let invoiceIds: any = [];
    if (params.invoices != undefined) {
        invoicesPaid = params.invoices.split(',');
    }

    if (invoicesPaid.length > 0) {
        invoiceIds = invoicesPaid.map((invoiceID: string) => (
            new ObjectId(invoiceID.trim())
        ));
    }

    Payment.findById(params.paymentId)
        .then((payment: IPayment | null) => {

            if (payment == undefined || payment == null) {
                throw new Error('Invalid payment Id.');
            } else {
                previousDedeuctedBalance = payment.amountPaid;
                return payment.updateOne({ amountPaid: roundTwoDecimal(params.amount), referenceNumber: params.referenceNumber, paymentType: params.paymentType, paidAt: params.paidAt, invoices: invoiceIds, udpatedBy: user._id, udpatedAt: Date.now() });
            }
        })
        .then((response: any) => {

            return new Promise<void>((resolve, reject) => {

                Customer.findById(params.customerId)
                    .then((customer: ICustomer) => {

                        let newBalance = customer.balance + previousDedeuctedBalance;
                        newBalance = newBalance - params.amount;

                        customer.updateOne({ balance: roundTwoDecimal(newBalance) })
                            .then((res: any) => {
                                resolve();
                            })
                            .catch((err: any) => {
                                Sentry.captureException(err);
                                reject(err);
                            });
                    })
                    .catch((err: any) => {
                        Sentry.captureException(err);
                        reject(err);
                    });
            });
        })
        .then((result: any) => {
            return Invoice.updateMany({ _id: { $in: invoiceIds } }, { paid: true });
        })
        .then((response: any) => {
            return res.json({ 'status': Status.Success, 'message': 'Payment update successfully.' });
        })
        .catch((error: any) => {
            Sentry.captureException(error);
            if (error != undefined && error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message });
            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }
        });
};

export const getPayrollBalance = async (req: Request, res: Response) => {
    const params = req.query;
    const company = <ICompany>req.company;
    const vendors: any = [];
    const employees: any = [];
    const query: any = {}, queryPaymentVendor: any = {}, queryPaymentEmployee: any = {}, queryAdvancePaymentVendor: any = {}, queryAdvancePaymentEmployee: any = {};

    // Check when startDate and endDate is provided, offset must be required
    if (params.startDate && params.endDate && !params.offset) {
        return res.json({ status: Status.Error, message: 'Params offset is required when startDate and endDate provided' });
    }

    _fillQueriesPayrollBalance(params, query, queryPaymentVendor, queryPaymentEmployee, queryAdvancePaymentVendor, queryAdvancePaymentEmployee);

    // get job with unpaid technician or contractor
    //Get Jobs Commission
    const [techniciansCommissionsInvoices, techniciansCommissionsJobs] = await Promise.all([_getTechnicianCommisionsInvoices(query, company),
        _getTechnicianCommisionsJobs(query, company)]);

    const { contractors, technicians } = await _getTechniciansContrators(techniciansCommissionsInvoices, techniciansCommissionsJobs);

    await Promise.all([_fillEmployeesAndVendorFromInvoices(techniciansCommissionsInvoices, technicians, contractors, employees, vendors),
        _fillEmployeesAndVendorFromJobs(techniciansCommissionsJobs, technicians, contractors, employees, vendors)]);

    await Promise.all([_getVendorPayments(vendors, company, queryPaymentVendor, queryAdvancePaymentVendor),
        _getEmployeePayments(employees, company, queryPaymentEmployee, queryAdvancePaymentEmployee)]);

    return res.json({
        status: Status.Success,
        startDate: params.startDate,
        endDate: params.endDate,
        offset: params.offset,
        vendors,
        employees
    });

};

export const getPayrollReport = async (req: Request, res: Response) => {


    const params = req.query;
    const company = <ICompany>req.company;
    const vendors: any = [];
    const employees: any = [];
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;

    let techQuery: any;
    let query: any = {};

    if (params.startDate && params.endDate) {
        if (!params.offset) {
            return res.json({ status: Status.Error, message: 'Params offset is required when startDate and endDate provided' });
        }

        const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
        const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();
        query = { issuedDate: { $gte: startDate, $lte: endDate } };
    }

    switch (params.type) {
    case 'vendor':
        techQuery = { 'technicians.contractor': params.id };
        break;

    case 'employee':
        techQuery = { 'technicians.technician': params.id };
        break;

    default:
        techQuery = {};
        break;
    }

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        query['workType'] = { $in: workTypeIds };
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        query['companyLocation'] = { $in: companyLocationIds };
    }

    const invoices = await Invoice.find({
        company: company._id,
        isDraft: { $ne: true },
        ...query
    });

    const invoiceIds = invoices.map(invoice => invoice._id);
    const invoiceCommissions = await InvoiceCommission.find({
        invoice: { $in: invoiceIds }, 'technicians.$[].paid': { $ne: true },
        ...techQuery
    }).populate({ path: 'invoice' });

    for (const invoiceCommission of invoiceCommissions) {
        const invoice = <IInvoice>invoiceCommission.invoice;

        await invoice
            .populate({
                path: 'job',
                populate: [
                    { path: 'technician', select: 'profile auth.email contact' },
                    { path: 'contractor', select: 'info address contact' },
                    { path: 'tasks.technician', select: 'profile auth.email contact' },
                    { path: 'tasks.contractor', select: 'info address contact' },
                    { path: 'tasks.jobTypes.jobType', select: 'title description sku' }
                ],
            })
            .populate({
                path: 'items.item',
                select: 'name description sku itemCode note cost price',
                populate: [{ path: 'jobType' }]
            })
            .populate({
                path: 'company',
                select: 'info permissions.role address contact'
            })
            .populate({
                path: 'customer',
                select: 'info auth.email profile address contact contactName'
            })
            .populate({
                path: 'estimate',
                select: 'total items note status customer company createdBy'
            })
            .populate({
                path: 'commission',
                populate: [{ path: 'technician', select: 'profile auth.email contact' }]
            }).execPopulate();

        if (invoiceCommission.technicians) {
            for (const technicianCommission of invoiceCommission.technicians) {
                if (params.type !== 'employee' && technicianCommission.contractor && !technicianCommission.paid) {
                    const contractor = await Company.findById(technicianCommission.contractor).exec();

                    vendors.push({
                        invoice,
                        contractor,
                        commissionAmount: Number(technicianCommission.commissionAmount.toFixed(2)),
                    });
                }

                if (params.type !== 'vendor' && technicianCommission.technician && !technicianCommission.contractor && !technicianCommission.paid) {
                    const technician = await User.findById(technicianCommission.technician).exec();

                    employees.push({
                        invoice,
                        employee: technician,
                        commissionAmount: Number(technicianCommission.commissionAmount.toFixed(2)),
                    });
                }
            }
        }
    }

    const jobs = await Job.find({
        company: company._id,
        status: 2,
        commission: { $ne: null }
    });


    const jobIds = jobs.map(job => job._id);
    const jobCommisssions = await JobCommission.find({
        job: { $in: jobIds }, 'technicians.$[].paid': { $ne: true },
        ...techQuery
    }).populate({ path: 'job' });

    for (const jobCommisssion of jobCommisssions) {
        const job = <IJob>jobCommisssion.job;

        await job
            .populate({
                path: 'technician',
                select: 'profile auth.email contact',
            })
            .populate({
                path: 'contractor',
                select: 'info address contact',
            })
            .populate({
                path: 'tasks.technician',
                select: 'profile auth.email contact',
            })
            .populate({
                path: 'tasks.contractor',
                select: 'info address contact',
            })
            .populate({
                path: 'tasks.jobTypes.jobType',
                select: 'title description sku',
            })
            .populate({
                path: 'commission',
                populate: [{ path: 'technician', select: 'profile auth.email contact' }]
            }).execPopulate();

        if (jobCommisssion.technicians) {
            for (const technicianCommission of jobCommisssion.technicians) {
                if (params.type !== 'employee' && technicianCommission.contractor && !technicianCommission.paid) {
                    const contractor = await Company.findById(technicianCommission.contractor).exec();

                    vendors.push({
                        job,
                        contractor,
                        commissionAmount: Number(technicianCommission.commissionAmount.toFixed(2)),
                    });
                }

                if (params.type !== 'vendor' && technicianCommission.technician && !technicianCommission.contractor && !technicianCommission.paid) {
                    const technician = await User.findById(technicianCommission.technician).exec();

                    employees.push({
                        job,
                        employee: technician,
                        commissionAmount: Number(technicianCommission.commissionAmount.toFixed(2)),
                    });
                }
            }
        }
    }


    return res.json({ status: Status.Success, vendors, employees });
};

export const exportVendorJobs =  async (req: Request, res: Response) => {
    const params = req.query;
    const company = <ICompany>req.company;
    const workType = params.workType as string;
    const companyLocation = params.companyLocation as string;
    const startDate = params.startDate as string;
    const endDate = params.endDate as string;

    const startDateFormatted = moment(startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().toDate();
    const endDateFormatted = moment(endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().toDate();
    
    const query: IJobExportQuery = {
        company: company._id,
        status: 2,
        endTime: { $gte: startDateFormatted, $lte: endDateFormatted },
        commission: { $ne: null }
    };

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }

        query['workType'] = { $in: workTypeIds };
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        query['companyLocation'] = { $in: companyLocationIds };
    }


    const contractor = await Company.findById(params.id).select('info');

    if (!contractor) {
        return res.status(Status.NotFound).json({
            status: Status.NotFound,
            message: 'Contractor not found',
        });
    }
    
    const jobs = await Job.aggregate([
        {$match: query},
        { 
            $lookup : {
                from : 'jobcommissions',
                localField : 'commission',
                foreignField : '_id',
                pipeline: [
                    {$match: {'technicians.paid': false, 'technicians.contractor': new ObjectId(params.id)}},
                    {
                        $unwind: '$technicians'
                    },
                    {$lookup: {
                        from: 'users',
                        // localField: 'technicians.technician',
                        // foreignField : '_id',
                        let: {
                            technician: {
                                $toObjectId: '$technicians.technician'
                            },
                            technicians: '$technicians'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            '$_id',
                                            '$$technician'
                                        ]
                                    }
                                }
                            },
                            {
                                $replaceRoot: {
                                    newRoot: {
                                        $mergeObjects: [
                                            '$$technicians',
                                            '$$ROOT.profile'
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'technicians',

                    }},
                    {
                        $group: {
                            _id: '$_id',
                            
                            technicians: {
                                $push: {
                                    $first: '$technicians'
                                }
                            }
                        }
                    }
                ],
                as : 'commission',
                
            },
            
        },
        { $lookup : {
            from : 'joblocations',
            localField : 'jobLocation',
            foreignField : '_id',
            pipeline: [{ '$project': { name: 1 }}],
            as : 'jobLocation',
        }},
        { $lookup : {
            from : 'jobsites',
            localField : 'jobSite',
            foreignField : '_id',
            pipeline: [{ '$project': { name: 1 }}],
            as : 'jobSite',
        }},
        {$unwind: '$commission'},
        {
            $project: {
                _id: 1, jobId: 1, endTime: 1, jobLocation: {$first: '$jobLocation'}, jobSite: {$first: '$jobSite'}, commission: '$commission'
            }
        },
        {
            $sort: {endTime: -1}
        }
       
    ]);


    let excelRows: IJobExcelRow[] = [];
    jobs.map((job: IJob) => {
        const rows = _convertJobToRowExcel(job, params.id);
        excelRows = [...excelRows, ...rows];
    });

    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const headers = ['Job Number', 'Date', 'Subdivision', 'Job Address', 'Amount', 'Technician Name'];
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dates');
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const contractorName = contractor.info.displayName || contractor.info.companyName;
    const filename = `${contractorName} ${params.startDate}-${params.endDate}.xlsx`;
    res.attachment(filename);
    res.header('Access-Control-Expose-Headers', 'Content-Type, Location, Content-Disposition');
    res.status(200).end(buf);
};

export const voidPaymentContractor = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    let payment: IPayment;
    let paymentVendor: IPaymentVendor;
    let paymentEmployee: IPaymentEmployee;
    let customer: ICustomer;

    switch (params.type) {
    case 'vendor':
        payment = await Payment.findOne({ _id: params.paymentId, company, __t: 'PaymentVendor' }).exec();
        paymentVendor = <IPaymentVendor>payment;

        if (!payment) {
            return res.json({ status: Status.Error, message: `Payment with type ${params.type} is Not Found` });
        }
        break;

    case 'employee':
        payment = await Payment.findOne({ _id: params.paymentId, company, __t: 'PaymentEmployee' }).exec();

        if (!payment) {
            return res.json({ status: Status.Error, message: `Payment with type ${params.type} is Not Found` });
        }
        break;

    case 'customer':
        payment = await Payment.findOne({ _id: params.paymentId, company, __t: { $nin: ['PaymentEmployee', 'PaymentVendor'] } }).exec();

        if (!payment) {
            return res.json({ status: Status.Error, message: `Payment with type ${params.type} is Not Found` });
        }
        customer = await Customer.findById(payment.customer);
        break;

    default:
        return res.json({ status: Status.Error, message: 'Type is required' });
    }

    const invoiceIds: string[] = [];
    const jobIds: string[] = [];

    if (payment) {
        if (payment.isVoid) {
            return res.json({ status: Status.Error, message: 'Payment already voided' });
        }

        payment.isVoid = true;
        payment.voidedAt = new Date();
        await payment.save();

        if (payment?.line?.length) {
            payment.line.forEach(line => invoiceIds.push(line.invoice.toString()));
        }

        if (payment?.invoices?.length) {
            payment.invoices.forEach(invoice => invoiceIds.push(invoice.toString()));
        }

        if (payment?.invoice) {
            invoiceIds.push(payment.invoice.toString());
        }

        if (payment?.jobs?.length) {
            payment.jobs.forEach(job => jobIds.push(job.toString()));
        }

        try {
            if(invoiceIds.length) await _handleVoidPayment(params.type, invoiceIds, payment, customer,user);
            if(jobIds.length) await _handleVoidJobPayment(params.type, jobIds);
            await _handleVoidPaymentContractor(params.type, paymentVendor, company._id);
        } catch (err) {
            Sentry.captureException(err);
            return res.json({ status: Status.Error, message: err.message });
        }

        // Delete payment in quickbook
        if (company.qbAuthorized && payment.quickbookId) {
            _voidPayment(req, res, company, payment);
        }

    }
    
  
    return res.json({ status: Status.Success, message: 'Payment void successfully', payment });

};

// To handle create payment for multiple invoices
export const _handleMultipleInvoices = async (
    paramInvoice: any,
    payment: IPayment,
    customer: ICustomer,
    company: ICompany
) => {
    const invoice = await Invoice.findOne({
        _id: paramInvoice.invoiceId,
        customer: customer._id,
        company: company._id,
        isVoid: { $ne: true }
    });

    if (!invoice || invoice.isDraft) {
        return { error : 'invoice_not_found', invoiceId: invoice.invoiceId};
    }

    if (invoice.status === InvoiceStatus.PAID) {
        return { error : 'already_paid_off', invoiceId: invoice.invoiceId};
    }

    payment.line.push({
        invoice: invoice,
        amountPaid: roundTwoDecimal(paramInvoice.amountPaid)
    });
 
    payment.amountPaid = payment.amountPaid ?? 0;
    payment.amountPaid += paramInvoice.amountPaid;

    const invoiceLogsObj:any={invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.PAYMENT_RECORDED, info:'Payment of $'+paramInvoice.amountPaid+' recorded', amountPaid:paramInvoice.amountPaid, customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company, createdBy:payment.createdBy};
    InvoiceLogController.create(invoiceLogsObj);

    await _calculateInvoiceBalance(invoice, customer, parseFloat(paramInvoice.amountPaid));

    return { invoice, amountPaid: paramInvoice.amountPaid };
};

// To handle update payment with multiple invoices
export const _handleUpdateMultipleInvoices = async (paramsInvoices: any[], payment: IPayment, customer: ICustomer, company: ICompany,oldAmountPaid:any): Promise<IInvoice[]> => {
    const invoices: IInvoice[] = [];
    let newAmountPaid, diffAmountPaid = 0;
    let paymentAmountPaid = 0;

    for (const paramInvoice of paramsInvoices) {
        // find invoice id in payment line
        let line = payment.line.find((invoiceLine: any) =>
            invoiceLine.invoice._id.toString() === paramInvoice.invoiceId
        );

        // When invoice id not found in payment line, add the invoice id to payment line
        if (!line) {
            const resInvoices: any = await _handleMultipleInvoices(paramInvoice, payment, customer, company);
            if (!resInvoices.error) {
                line = resInvoices;
            }
        }

        const invoiceLine = <IInvoice>line.invoice;
        const oldAmountPaid = line.amountPaid;
        if (paramInvoice.amountPaid !== line.amountPaid) {
            newAmountPaid = Number(paramInvoice.amountPaid);
            diffAmountPaid = newAmountPaid - oldAmountPaid;
        }

        // calculate amountPaid when invoice line amount paid is updated
        line.amountPaid = Number(paramInvoice.amountPaid) ?? line.amountPaid;

        if (invoiceLine.balanceDue === 0 && diffAmountPaid < 0 && newAmountPaid >= invoiceLine.total) {
            customer.credit += diffAmountPaid;
            customer.credit = roundTwoDecimal(customer.credit);
            await customer.save();
        } else {
            await _calculateInvoiceBalance(invoiceLine, customer, diffAmountPaid);
        }

        invoices.push(invoiceLine);

        const invoiceLogsObj:any={invoiceId: invoiceLine.invoiceId, invoice: invoiceLine._id, type: logType.PAYMENT_UPDATED, info:'Payment of $'+oldAmountPaid+' updated to $'+payment.amountPaid, amountPaid:payment.amountPaid, customer: invoiceLine.customer, companyLocation: invoiceLine.companyLocation, workType: invoiceLine.workType, company: invoiceLine.company, createdBy: payment.updatedBy};
        InvoiceLogController.create(invoiceLogsObj);

    }

    payment.line.forEach(paymentLine => {
        paymentAmountPaid += paymentLine.amountPaid;
    });

    payment.amountPaid = roundTwoDecimal(paymentAmountPaid);
    return invoices;
};

export const _handleVoidPayment = async (paymentType: string, invoiceIds: string[], payment: IPayment, customer: ICustomer,user:IUser) => {

    const invoices = await Invoice.find({ _id: { $in: [...new Set(invoiceIds)] } });

    if (customer) {
        customer.balance += payment.amountPaid;
        customer.balance = roundTwoDecimal(customer.balance);
        await customer.save();
    }

    if (invoices?.length) {
        for (const invoice of invoices) {
            if (['vendor', 'employee'].includes(paymentType)) {
                // Find commissions of vendor or employee
                const invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id }).exec();
                if (invoiceCommission?.technicians) {
                    // Iterate and revert back commission balance
                    for (const technicianCommission of invoiceCommission.technicians) {
                        if (technicianCommission.contractor) {
                            const contractor = await Company.findById(technicianCommission.contractor).exec();
                            contractor.balance += technicianCommission.commissionAmount;
                            contractor.balance = roundTwoDecimal(contractor.balance);
                            await contractor.save();
                        }

                        if (technicianCommission.technician && !technicianCommission.contractor) {
                            const technician = await User.findById(technicianCommission.technician).exec();
                            technician.balance += technicianCommission.commissionAmount;
                            technician.balance = roundTwoDecimal(technician.balance);
                            await technician.save();
                        }

                        technicianCommission.paid = false;
                    }
                    await invoiceCommission.save();
                }
            }

            if (paymentType === 'customer') {
                // Find invoice in line for multiple invoices
                const paymentLine = payment?.line?.find(line => line.invoice.toString() === invoice._id.toString());

                // Set default paymentApplied and balanceDue if not exist on old invoice
                invoice.paymentApplied = invoice.paymentApplied ? invoice.paymentApplied : 0;
                invoice.balanceDue = invoice.balanceDue ?? (invoice.total - invoice.paymentApplied) ?? invoice.total;

                // Revert back invoice balanceDue and paymentApplied for PaymentCustomer
                invoice.balanceDue += paymentLine?.amountPaid ?? payment.amountPaid;
                invoice.paymentApplied -= paymentLine?.amountPaid ?? payment.amountPaid;

                // Set limit to balance due and payment applied
                invoice.paymentApplied = invoice.paymentApplied < 0 ? 0 : invoice.paymentApplied;
                invoice.balanceDue = invoice.balanceDue > invoice.total ? invoice.total : invoice.balanceDue;

                if (invoice.balanceDue > 0) {
                    invoice.paid = false;
                    invoice.status = InvoiceStatus.PARTIALLY_PAID;
                }

                if (invoice.paymentApplied <= 0) {
                    invoice.paid = false;
                    invoice.status = InvoiceStatus.UNPAID;
                }

                // Round the numbers
                invoice.paymentApplied = roundTwoDecimal(invoice.paymentApplied);
                invoice.balanceDue = roundTwoDecimal(invoice.balanceDue);

                await invoice.save();
            }

            const invoiceLogsObj:any={invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.PAYMENT_VOID, info:'Payment of $'+payment.amountPaid+' voided', amountPaid:payment.amountPaid*-1, customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company, createdBy: user._id};
            InvoiceLogController.create(invoiceLogsObj);

        }
    } else {
        throw new Error('Invoice not found');
    }

    return;
};

export const _handleVoidJobPayment = async (paymentType: string, jobIds: string[]) => {
    const jobs = await Job.find({ _id: { $in: [...new Set(jobIds)] } });
    
    if (jobs?.length) {
        for (const job of jobs) {
            if (['vendor', 'employee'].includes(paymentType)) {
                // Find commissions of vendor or employee
                const jobCommission = await JobCommission.findOne({ job: job._id }).exec();
                if (jobCommission?.technicians) {
                    // Iterate and revert back commission balance
                    for (const technicianCommission of jobCommission.technicians) {
                        if (technicianCommission.contractor) {
                            const contractor = await Company.findById(technicianCommission.contractor).exec();
                            contractor.balance += technicianCommission.commissionAmount;
                            contractor.balance = roundTwoDecimal(contractor.balance);
                            await contractor.save();
                        }

                        if (technicianCommission.technician && !technicianCommission.contractor) {
                            const technician = await User.findById(technicianCommission.technician).exec();
                            technician.balance += technicianCommission.commissionAmount;
                            technician.balance = roundTwoDecimal(technician.balance);
                            await technician.save();
                        }

                        technicianCommission.paid = false;
                    }
                    await jobCommission.save();
                }
            }
        }
    } else {
        throw new Error('Job not found');
    }

    return;
};

const _convertJobToRowExcel = (job: any, contractor: string): IJobExcelRow[] => {
    const rows: IJobExcelRow[] = [];
    
    if (!job) {
        return rows;
    }

    job.commission?.technicians?.map((tech: any) => {
        if (tech?.contractor.toString() !== contractor) return;
        rows.push({
            jobNumber: job.jobId,
            date: moment.utc(job.endTime).format('ll'),
            subdivision: job.jobLocation?.name,
            jobAdress: job.jobSite?.name,
            amount: tech?.commissionAmount,
            techName: tech?.displayName,
        });
    });

           
    return rows;
};

/**
 * Partial method called by voidPaymentContractor,
 * to handle reverting back the advance payment's balance,
 * and to revert back the contractor's credit
 */
const _handleVoidPaymentContractor = async (paymentType: string, paymentVendor: IPaymentVendor, companyId: string) => {

    // This method only serve for voiding payment vendor/contractor
    if (paymentType !== 'vendor') {
        return;
    }

    // Find contractor and construct startDate endDate for query
    const contractor = await Company.findById(paymentVendor.contractor);
    const startDate = moment(paymentVendor.startDate).startOf('day').utcOffset(paymentVendor.offset ?? '', true).utc().format();
    const endDate = moment(paymentVendor.endDate).endOf('day').utcOffset(paymentVendor.offset ?? '', true).utc().format();

    // Revert deducted contractor credit
    contractor.credit += paymentVendor.creditUsed;

    /**
     * REVERT DEDUCTED ADVANCE PAYMENT'S BALANCE
     */

    /**
     * Find the advance payments of vendor, in reverse order,
     * to revert to the latest advance payment first
     */
    const vendorAdvancePayments = await AdvancePayment.find({
        company: companyId,
        isVoid: { $ne: true },
        contractor: contractor._id,
        appliedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).sort({ _id: -1 });

    // Get the credit used to be reverted
    let creditUsed = paymentVendor.creditUsed;

    if (!creditUsed) {
        return;
    }

    for (const advancePayment of vendorAdvancePayments) {
        if (advancePayment.balance + creditUsed > advancePayment.amount) {
            /**
             * Credit used is bigger than the balance to be reverted,
             * only reverted as much as the advance payment amount
             */
            creditUsed -= (advancePayment.amount - advancePayment.balance);
            advancePayment.balance = advancePayment.amount;
        } else {
            // Credit used is smaller or same with the balance, revert directly
            advancePayment.balance += creditUsed;
            creditUsed = 0;
        }

        await advancePayment.save();

        // No more credit used to be reverted
        if (creditUsed <= 0) {
            break;
        }
    }

    return;

};

const _getVendorPayments = async (vendors: any[], company: ICompany, queryPayment: any, queryAdvancePayment: any) => {
    queryPayment.company = company._id;
    queryPayment.isVoid = { $ne: true };
    queryAdvancePayment.company = company._id;
    queryAdvancePayment.isVoid = { $ne: true };
    const contractorsIds = vendors.map((value) => value?.contractor?._id).filter((value) => value !== undefined);
    queryPayment.contractor = { $in: contractorsIds };
    queryAdvancePayment.contractor = { $in: contractorsIds };
    // Retrieve advance payments history and the total of it
    const advancePayments = (await AdvancePaymentVendor.aggregate([
        { $match: { ...queryAdvancePayment } },
        {
            $group: {
                _id: { contractor: '$contractor', company: '$company' },
                totalAdvancePayment: { $sum: '$amount' },
                creditAvailable: { $sum: '$balance' }
            }
        }
    ])).reduce((accumulator, currentValue) => {
        accumulator[currentValue._id.contractor.toString()] = currentValue;
        return accumulator;
    }, {});
    // Retrieve payments history and the total of it
    const payments = (await PaymentVendor.aggregate([
        { $match: { ...queryPayment } },
        {
            $group: {
                _id: { contractor: '$contractor', company: '$company' },
                creditUsed: { $sum: '$creditUsed' }
            }
        }
    ])).reduce((accumulator, currentValue) => {
        accumulator[currentValue._id.contractor.toString()] = currentValue;
        return accumulator;
    }, {});
    for (const vendor of vendors) {
        const advancePayment = advancePayments[vendor?.contractor?._id?.toString()];
        const payment = payments[vendor?.contractor?._id?.toString()];

        // Put the retrieved history and total to each vendor
        vendor.advancePaymentTotal = advancePayment?.totalAdvancePayment ?? 0;
        vendor.creditAvailable = advancePayment?.creditAvailable ?? 0;
        vendor.creditUsedTotal = payment?.creditUsed ?? 0;

    }
};

const _getEmployeePayments = async (employees: any[], company: ICompany, queryPayment: any, queryAdvancePayment: any) => {
    queryPayment.company = company._id;
    queryPayment.isVoid = { $ne: true };
    queryAdvancePayment.company = company._id;
    queryAdvancePayment.isVoid = { $ne: true };
    const employeesIds = employees.map((value) => value.employee?._id).filter((value) => value !== undefined);
    queryPayment.employee = { $in: employeesIds };
    queryAdvancePayment.employee = { $in: employeesIds };
    // Retrieve advance payments history and the total of it
    const advancePayments = (await AdvancePaymentEmployee.aggregate([
        { $match: { ...queryAdvancePayment } },
        {
            $group: {
                _id: { employee: '$employee', company: '$company' },
                totalAdvancePayment: { $sum: '$amount' },
                creditAvailable: { $sum: '$balance' }
            }
        }
    ])).reduce((accumulator, currentValue) => {
        accumulator[currentValue._id.employee.toString()] = currentValue;
        return accumulator;
    }, {});
    // Retrieve payments history and the total of it
    const payments = (await PaymentEmployee.aggregate([
        { $match: { ...queryPayment } },
        {
            $group: {
                _id: { employee: '$employee', company: '$company' },
                totalPayment: { $sum: '$amountPaid' },
                creditUsed: { $sum: '$creditUsed' }
            }
        }
    ])).reduce((accumulator, currentValue) => {
        accumulator[currentValue._id.employee.toString()] = currentValue;
        return accumulator;
    }, {});
    for (const employee of employees) {
        const advancePayment = advancePayments[employee?.employee?._id?.toString()];
        const payment = payments[employee?.employee?._id?.toString()];
        // Put the retrieved history and total to each employee
        employee.advancePaymentTotal = advancePayment?.totalAdvancePayment ?? 0;
        employee.creditAvailable = advancePayment?.creditAvailable ?? 0;
        employee.creditUsedTotal = payment?.creditUsed ?? 0;
    }
};

/**
 * Fill the queries requeried to get the payroll balance
 * @param {any} params params received by the query on the request
 * @param {any} query query applied on invoices and jobs
 * @param {any} queryPaymentVendor query applied on vendor payments
 * @param {any} queryPaymentEmployee query applied in employee payments
 * @param {any} queryAdvancePaymentVendor query applied in vendor advance payments
 * @param {any} queryAdvancePaymentEmployee query applied in employee advance payments
 */
const _fillQueriesPayrollBalance = (params: any, query: any, queryPaymentVendor: any, queryPaymentEmployee: any, queryAdvancePaymentVendor: any, queryAdvancePaymentEmployee: any) => {
    const { startDate, endDate, workType, companyLocation, offset } = params;
    if (startDate && endDate) {
        const startDateFormatted = moment(startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
        const endDateFormatted = moment(endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();
        query['date'] = { $gte: startDateFormatted, $lte: endDateFormatted };
        queryPaymentVendor['paidAt'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
        queryAdvancePaymentVendor['appliedAt'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
        queryPaymentEmployee['paidAt'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
        queryAdvancePaymentEmployee['appliedAt'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        query['workType'] = { $in: workTypeIds };
        queryPaymentVendor['workType'] = { $in: workTypeIds };
        queryAdvancePaymentVendor['workType'] = { $in: workTypeIds };
        queryPaymentEmployee['workType'] = { $in: workTypeIds };
        queryAdvancePaymentEmployee['workType'] = { $in: workTypeIds };
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) { }
        query['companyLocation'] = { $in: companyLocationIds };
        queryPaymentVendor['companyLocation'] = { $in: companyLocationIds };
        queryAdvancePaymentVendor['companyLocation'] = { $in: companyLocationIds };
        queryPaymentEmployee['companyLocation'] = { $in: companyLocationIds };
        queryAdvancePaymentEmployee['companyLocation'] = { $in: companyLocationIds };
    }
};

/**
 * Get from the database technician comissions linked to invoices
 * @param {any} query query to filter invoices
 * @param {ICompany} company company where the invoices are linked
 * @returns {Promise<ITechnicianCommissionInvoice[]>}
 */
const _getTechnicianCommisionsInvoices = async (query: any, company: ICompany): Promise<ITechnicianCommissionInvoice[]> => {
    const invoiceQuery = {...query};
    if (invoiceQuery['date']) {
        invoiceQuery['issuedDate'] = invoiceQuery['date'];
        delete invoiceQuery['date'];
    } 
    
    const techniciansCommissionsInvoices: ITechnicianCommissionInvoice[] = (await Invoice.find({
        company: company._id,
        isDraft: { $ne: true },
        job: { $ne: null },
        ...invoiceQuery
    })
        .populate({ path: 'commission' })
        .lean())
        .flatMap((value: IInvoice) => {
            return (<IInvoiceCommission>value.commission)?.technicians?.map((value2: any) => {
                return {
                    ...value2,
                    invoice: {
                        id: value._id,
                        workType: value.workType,
                        companyLocation: value.companyLocation
                    }
                };
            });
        })
        .filter((value: any) => value !== undefined);
    return techniciansCommissionsInvoices;
};

/**
 * Get from the database technician comissions linked to jobs
 * @param {any} query query to filter invoices
 * @param {ICompany} company company where the invoices are linked
 * @returns {Promise<ITechnicianCommissionInvoice[]>}
 */
const _getTechnicianCommisionsJobs = async (query: any, company: ICompany): Promise<ITechnicianCommissionJob[]> => {
    const jobQuery = {...query};
    if (jobQuery['date']) {
        jobQuery['endTime'] = jobQuery['date'];
        delete jobQuery['date'];
    } 

    const techniciansCommissionsJobs: ITechnicianCommissionJob[] = (await Job.find({
        company: company._id,
        status: 2,
        commission: { $ne: null },
        ...jobQuery
    }).populate({ path: 'commission' })
        .lean())
        .flatMap((value: IJob) => {
            return (<IJobCommission>value.commission)?.technicians?.map((value2: any) => {
                return {
                    ...value2,
                    job: {
                        id: value._id,
                        workType: value.workType,
                        companyLocation: value.companyLocation
                    }
                };
            });
        })
        .filter((value: any) => value !== undefined);
    return techniciansCommissionsJobs;
};


/**
 * Get technician and contractor from technician commissions got from invoices and jobs
 * @param {ITechnicianCommissionInvoice[]} techniciansCommissionsInvoices 
 * @param {ITechnicianCommissionJob[]} techniciansCommissionsJobs 
 * @returns {Promise<{ contractors: {[param:string]: ICompany}, technicians: {[param:string]:IUser} }>}
 */
const _getTechniciansContrators = async (techniciansCommissionsInvoices: ITechnicianCommissionInvoice[],
    techniciansCommissionsJobs: ITechnicianCommissionJob[]): Promise<{ contractors: { [param: string]: ICompany }, technicians: { [param: string]: IUser } }> => {
    const concatenation: Array<ITechnicianCommissionInvoice | ITechnicianCommissionJob> = [...techniciansCommissionsInvoices, ...techniciansCommissionsJobs];
    const { techniciansIds, contractorsIds } = concatenation
        .reduce((accumulator, technicianCommission) => {
            if (technicianCommission.contractor && !technicianCommission.paid) {
                accumulator.contractorsIds.push(technicianCommission.contractor);
            }
            if (technicianCommission.technician && !technicianCommission.contractor && !technicianCommission.paid) {
                accumulator.techniciansIds.push(technicianCommission.technician);
            }
            return accumulator;
        }, { techniciansIds: [], contractorsIds: [] });

    const contractors = (await Company.find({ _id: { $in: Array.from(new Set(contractorsIds)) } }))
        .reduce((accumulator: any, contractor) => {
            accumulator[contractor._id.toString()] = contractor;
            return accumulator;
        }, {});
    const technicians = (await User.find({ _id: { $in: Array.from(new Set(techniciansIds)) } }))
        .reduce((accumulator: any, technician) => {
            accumulator[technician._id.toString()] = technician;
            return accumulator;
        }, {});
    return { contractors, technicians };
};

const _fillEmployeesAndVendorFromInvoices = (techniciansCommissionsInvoices: ITechnicianCommissionInvoice[],
    technicians: { [param: string]: IUser }, contractors: { [param: string]: ICompany }, employees: any[], vendors: any[]) => {
    for (const technicianCommission of techniciansCommissionsInvoices) {
        const { invoice } = technicianCommission;
        if (technicianCommission.contractor && !technicianCommission.paid) {
            const contractor = contractors[technicianCommission.contractor.toString()];
            const contractorEntry = vendors.find((v: any) => v.contractor._id?.toString() === technicianCommission.contractor?.toString());

            if (contractorEntry) {
                contractorEntry.commissionTotal += Number(technicianCommission.commissionAmount.toFixed(2));
                // contractorEntry.balanceDue += Number(technicianCommission.commissionAmount.toFixed(2));
                if (contractorEntry?.workType && !contractorEntry?.workType.includes(invoice?.workType?.toString())) contractorEntry?.workType?.push(invoice.workType?.toString());
                if (contractorEntry?.companyLocation && !contractorEntry?.companyLocation.includes(invoice?.companyLocation?.toString())) contractorEntry?.companyLocation?.push(invoice.companyLocation?.toString());
                contractorEntry?.invoiceIds?.push(invoice.id);
            } else {
                vendors.push({
                    contractor,
                    commissionTotal: Number(technicianCommission.commissionAmount.toFixed(2)),
                    // balanceDue: Number(technicianCommission.commissionAmount.toFixed(2)),
                    workType: [invoice.workType?.toString()],
                    companyLocation: [invoice.companyLocation?.toString()],
                    invoiceIds: [invoice.id],
                });
            }
        }

        if (technicianCommission.technician && !technicianCommission.contractor && !technicianCommission.paid) {
            const technician = technicians[technicianCommission.technician.toString()];
            const technicianEntry = employees.find((t: any) => t.employee._id?.toString() === technicianCommission.technician?.toString());

            if (technicianEntry) {
                technicianEntry.commissionTotal += Number(technicianCommission.commissionAmount.toFixed(2));
                // technicianEntry.balanceDue += Number(technicianCommission.commissionAmount.toFixed(2));
                if (technicianEntry?.workType && !technicianEntry?.workType.includes(invoice?.workType?.toString())) technicianEntry?.workType?.push(invoice.workType?.toString());
                if (technicianEntry?.companyLocation && !technicianEntry?.companyLocation.includes(invoice?.companyLocation?.toString())) technicianEntry?.companyLocation?.push(invoice.companyLocation?.toString());
                technicianEntry.invoiceIds.push(invoice.id);
            } else {
                employees.push({
                    employee: technician,
                    commissionTotal: Number(technicianCommission.commissionAmount.toFixed(2)),
                    // balanceDue: Number(technicianCommission.commissionAmount.toFixed(2)),
                    workType: [invoice.workType?.toString()],
                    companyLocation: [invoice.companyLocation?.toString()],
                    invoiceIds: [invoice.id],
                });
            }
        }
    }
};


const _fillEmployeesAndVendorFromJobs = (techniciansCommissionsJobs: ITechnicianCommissionJob[],
    technicians: { [param: string]: IUser }, contractors: { [param: string]: ICompany }, employees: any[], vendors: any[]) => {
    for (const technicianCommission of techniciansCommissionsJobs) {
        const { job } = technicianCommission;
        if (technicianCommission.contractor && !technicianCommission.paid) {
            const contractor = contractors[technicianCommission.contractor.toString()];
            const contractorEntry = vendors.find((v: any) => v.contractor._id?.toString() === technicianCommission.contractor?.toString());

            if (contractorEntry) {
                contractorEntry.commissionTotal += Number(technicianCommission.commissionAmount.toFixed(2));
                if (contractorEntry?.workType && !contractorEntry?.workType.includes(job?.workType?.toString())) contractorEntry?.workType?.push(job.workType?.toString());
                if (contractorEntry?.companyLocation && !contractorEntry?.companyLocation.includes(job?.companyLocation?.toString())) contractorEntry?.companyLocation?.push(job.companyLocation?.toString());
                if (contractorEntry?.jobIds) {
                    contractorEntry?.jobIds?.push(job.id);
                } else {
                    contractorEntry['jobIds'] = [job.id];
                }
            } else {
                vendors.push({
                    contractor,
                    commissionTotal: Number(technicianCommission.commissionAmount.toFixed(2)),
                    workType: [job.workType?.toString()],
                    companyLocation: [job.companyLocation?.toString()],
                    jobIds: [job.id],
                });
            }
        }

        if (technicianCommission.technician && !technicianCommission.contractor && !technicianCommission.paid) {
            const technician = technicians[technicianCommission.technician.toString()];
            const technicianEntry = employees.find((t: any) => t.employee._id?.toString() === technicianCommission.technician?.toString());

            if (technicianEntry) {
                technicianEntry.commissionTotal += Number(technicianCommission.commissionAmount.toFixed(2));
                if (technicianEntry?.workType && !technicianEntry?.workType.includes(job?.workType?.toString())) technicianEntry?.workType?.push(job.workType?.toString());
                if (technicianEntry?.companyLocation && !technicianEntry?.companyLocation.includes(job?.companyLocation?.toString())) technicianEntry?.companyLocation?.push(job.companyLocation?.toString());
                if (technicianEntry?.jobIds) {
                    technicianEntry?.jobIds?.push(job.id);
                } else {
                    technicianEntry['jobIds'] = [job.id];
                }
            } else {
                employees.push({
                    employee: technician,
                    commissionTotal: Number(technicianCommission.commissionAmount.toFixed(2)),
                    workType: [job.workType?.toString()],
                    companyLocation: [job.companyLocation?.toString()],
                    jobIds: [job.id],
                });
            }
        }
    }
};

/**
 * To calculate invoice and customer payment amount related
 */
export const _unpaidInvoice = async (invoice: IInvoice, customer: ICustomer): Promise<void> => {

    // Deduct the customer balance
    customer.balance = 0;

    // Fix default paymentApplied and balanceDue for old invoice
    invoice.paymentApplied = 0;
    invoice.balanceDue = invoice.total;

    invoice.status = InvoiceStatus.UNPAID;
    invoice.paid = false;

    // Round the numbers
    customer.balance = roundTwoDecimal(customer.balance);
    invoice.balanceDue = roundTwoDecimal(invoice.balanceDue);
    invoice.paymentApplied = roundTwoDecimal(invoice.paymentApplied);

    // Save the customer's changes
    await customer.save();
    // Save the invoice's changes
    await invoice.save();

    return;
};
