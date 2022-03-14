import { Request, Response } from 'express'
import { ObjectId } from 'mongodb'
import moment from 'moment'

import { Status, Messages, InvoiceStatus, DefaultCommission } from '../common/constants'
import { Company, ICompany } from '../models/Company'
import { IUser, User } from '../models/User'
import { Invoice, IInvoice } from '../models/Invoice'
import { Payment, IPayment, PaymentVendor, PaymentEmployee, PaymentCustomer, IPaymentVendor, IPaymentEmployee } from '../models/Payment'
import { Customer, ICustomer } from '../models/Customer'
import { _createQBPayment, _updateQBPayment } from './quickbook.payment'
import { Employee } from '../models/Employee'
import { Contract } from '../models/Contract'
import { IJob, Job } from '../models/Job'
import { IInvoiceCommission, InvoiceCommission } from '../models/InvoiceCommission'


/**
 * To calculate invoice and customer payment amount related,
 * invoice's balanceDue, paymentApplied, status, and paid,
 * customer's balance and credit
 */
export const _calculateInvoiceBalance = async (invoice: IInvoice, customer: ICustomer, amountPaid: number): Promise<void> => {
    // Check and set invoice balanceDue if not found
    invoice.balanceDue = invoice.balanceDue ?? invoice.total;

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

    // Save the customer's changes
    await customer.save();
    // Save the invoice's changes
    await invoice.save();

    return;

}

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

    Payment.find({ company: req.companyId, __t: { $nin: ['PaymentEmployee', 'PaymentVendor'] } })
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
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName auth.email'
        })
        .then((payments: IPayment[] | null) => {

            return res.json({ 'status': Status.Success, 'payment': payments })
        })
        .catch((error: any) => {
            if (error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message })
            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
        })

}

export const getPaymentsByCustomerId = (req: Request, res: Response) => {

    const params = req.query;

    Payment.find({ company: req.companyId, customer: params.customerId })
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
            select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName auth.email'
        })
        .then((payments: IPayment[] | null) => {

            return res.json({ 'status': Status.Success, 'payment': payments })
        })
        .catch((error: any) => {
            if (error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message })
            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
        })

}

export const getPaymentsByContractor = async (req: Request, res: Response) => {

    let query;
    let voidQuery;
    const params = req.query;
    const company = <ICompany>req.company;
    const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();

    if (params.startDate && params.endDate) {
        query = { paidAt: { $gte: startDate, $lte: endDate } }
    }

    switch (params.isActive) {
        case 'active':
            voidQuery = { isVoid: { $ne: true } };
            break;

        case 'void':
            voidQuery = { isVoid: true };
            break;

        default:
            voidQuery = {}
            break;
    }

    switch (params.type) {
        case 'vendor':
            const vendorQuery = { company: company._id, contractor: params.id, ...query, ...voidQuery }
            const contractorPayments = await PaymentVendor.find(vendorQuery)
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
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total note'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });

            return res.json({ status: Status.Success, payments: contractorPayments, payment: contractorPayments });

        case 'employee':
            const employeeQuery = { company, employee: params.id, ...query, ...voidQuery }
            const employeePayments = await PaymentEmployee.find(employeeQuery)
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
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total note'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });

            return res.json({ status: Status.Success, payments: employeePayments, payment: employeePayments });

        default:
            const payments = await Payment.find({ company: company._id, __t: { $in: ['PaymentVendor', 'PaymentEmployee'] }, ...query, ...voidQuery })
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
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total note'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                })
                .catch((error: any) => {
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });

            return res.json({ status: Status.Success, payments, payment: payments });
    }

}

/**
 * Create payment for single invoice
 */
export const createPayment = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    // Find and check if customer existed
    const customer = await Customer.findOne({
        _id: params.customerId,
        company: company._id
    });

    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found.' });
    }

    // Find and check if invoice existed and belongs to the customer
    const invoice = await Invoice.findOne({
        _id: params.invoiceId,
        customer: customer._id,
        company: company._id
    });

    if (!invoice || invoice.isDraft) {
        return res.json({ status: Status.Error, message: 'Invoice not found or does not belong to the customer.' });
    }
    if (invoice.status === InvoiceStatus.PAID) {
        return res.json({ status: Status.Success, message: 'Invoice already paid off.' });
    }

    // Construct payment entry
    const payment = new PaymentCustomer({
        customer,
        invoice,
        amountPaid: params.amount,
        referenceNumber: params.referenceNumber || new ObjectId().toString().substring(5, 20),
        paymentType: params.paymentType,
        paidAt: params.paidAt ? moment(params.paidAt).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        note: params.note,
        company,
        createdBy: user,
        createdAt: Date.now()
    });

    try {
        // Save the new payment
        await payment.save();

        // Handle invoice balance due, underpayment, and overpayment
        await _calculateInvoiceBalance(invoice, customer, parseFloat(params.amount));

        if (company.qbAuthorized) {
            // Create new Payment in QuickBooks
            _createQBPayment(req, res, company, payment, (err, errMsg, qbPayment) => {
                if (err) {
                    return res.json({ status: err, message: errMsg });
                }

                if (qbPayment) {
                    payment.quickbookId = qbPayment.Id;
                    payment.save();

                    // If company's payments already synced, update the synced date
                    if (company.qbSync?.paymentsSynced) {
                        company.qbSync.paymentsSyncedAt = new Date();
                        company.save();
                    }
                }

                return res.json({
                    status: Status.Success,
                    message: 'Payment successfully created.',
                    payment, quickbookPayment: qbPayment,
                    customer, invoice
                });
            });
        } else {
            return res.json({ status: Status.Success, message: 'Payment successfully created.', payment, customer, invoice });
        }

    } catch (error) {
        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
    }
}

export const createPaymentContractor = async (req: Request, res: Response) => {

    let query;
    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    const paramsInvoiceIds = params.invoiceIds?.length ? JSON.parse(params.invoiceIds) : [];
    if (!params.invoiceIds && !params.startDate && !params.endDate) {
        return res.json({ statstus: Status.Error, message: 'Either invoiceIds or startDate endDate is required.' });
    }

    const startDate = moment(params.startDate).startOf('day').utc().format();
    const endDate = moment(params.endDate).endOf('day').utc().format();

    if (paramsInvoiceIds.length) {
        query = { _id: { $in: paramsInvoiceIds } }
    } else if (params.startDate && params.endDate) {
        query = { $or: [{ issuedDate: { $gte: startDate, $lte: endDate } }] }
    } else {
        return res.json({ statstus: Status.Error, message: 'Either invoiceIds or startDate endDate is required' });
    }

    const invoices = await Invoice.find({ ...query, isDraft: { $ne: true } }).populate({ path: 'commission' });
    if (!invoices?.length) {
        return res.json({ status: Status.Error, message: 'No invoice found' });
    }
    const invoiceIds = invoices.map(invoice => invoice._id);

    // Construct the base payment entry
    const paymentEntry = {
        invoices: invoiceIds,
        amountPaid: params.amount,
        paymentType: params.paymentType,
        referenceNumber: params.referenceNumber || new ObjectId().toString().substring(5, 20),
        startDate: params.startDate ? moment(params.startDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        endDate: params.endDate ? moment(params.endDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        paidAt: params.paidAt ? moment(params.paidAt).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        note: params.note,
        company,
        createdBy: user,
        createdAt: Date.now(),
    };

    switch (params.type) {
        case 'vendor':
            // Check if vendor exist
            const contractor = await Company.findById(params.id).exec();
            if (!contractor) {
                return res.json({ status: Status.Error, messages: 'Vendor not found' });
            }

            // Save the Payment Vendor entry
            const paymentVendor = await new PaymentVendor({
                contractor,
                ...paymentEntry
            }).save();

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
                    await contractor.save();
                }
            }

            // Record payment for vendor is done, finish the request
            return res.json({ status: Status.Success, message: 'Payment successfully created.', payment: paymentVendor });

        case 'employee':
            // CHeck if employee exist
            const employee = await User.findById(params.id).exec();
            if (!employee) {
                return res.json({ status: Status.Error, messages: 'Employee not found' });
            }

            // Save the Payment Employee entry
            const paymentEmployee = await new PaymentEmployee({
                employee,
                ...paymentEntry
            }).save();

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
                    await employee.save();
                }
            }

            // Record payment for employee is done, finish the request
            return res.json({ status: Status.Success, message: 'Payment successfully created.', payment: paymentEmployee });

        default:
            return res.json({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

}

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
        })

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
        amountPaid: params.amount,
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
        await customer.save();

        // Update all invoices status to paid=true
        await Invoice.updateMany({ _id: { $in: invoiceIds } }, { paid: true });

        return res.json({ status: Status.Success, message: 'Payment created successfully.' });

    } catch (error) {
        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
    };

}

const updateInvoice = (invoice: IInvoice) => {
    return new Promise<void>((resolve, reject) => {
        invoice.update({ paid: true }, (err: any, res: any) => {
            if (err) {
                reject();
            }
            resolve();
        });
    });
}

/**
 * Update payment for single invoice
 */
export const updatePayment = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    // Find and check if customer existed
    const customer = await Customer.findOne({
        _id: params.customerId,
        company: company._id
    });

    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found.' });
    }

    // Find and check if payment existed and belongs to the customer
    const payment = await Payment.findOne({
        _id: params.paymentId,
        customer: customer._id,
        company: company._id
    }).populate({ path: 'invoice' });

    if (!payment) {
        return res.json({ status: Status.Error, message: 'Payment not found or does not belong to the customer.' });
    }

    const invoice = <IInvoice>payment.invoice;
    const oldAmountPaid = payment.amountPaid;
    let newAmountPaid, diffAmountPaid = 0;

    if (params.amount) {
        newAmountPaid = Number(params.amount);
        diffAmountPaid = newAmountPaid - oldAmountPaid;
    }

    payment.amountPaid = newAmountPaid ?? payment.amountPaid;
    payment.referenceNumber = params.referenceNumber;
    payment.paymentType = params.paymentType;
    payment.paidAt = params.paidAt ? new Date(moment(params.paidAt).format('YYYY-MM-DD')) : payment.paidAt;
    payment.note = params.note;
    payment.updatedBy = user;
    payment.updatedAt = new Date();

    try {
        // Save the updated payment
        await payment.save();

        // If amount changed, recalculate invoice & customer balance
        if (newAmountPaid && diffAmountPaid !== 0) {
            /**
             * If invoice full paid and the new amount still cover the whole invoice,
             * the deducted amount will only deduct customer's credit
             */
            if (invoice.balanceDue === 0 && diffAmountPaid < 0 && newAmountPaid >= invoice.total) {
                customer.credit += diffAmountPaid;
                customer.save();
            } else {
                // Otherwise, recalculate invoice & customer balance
                await _calculateInvoiceBalance(invoice, customer, diffAmountPaid)
            }
        }

        if (company.qbAuthorized && invoice.quickbookId && payment.quickbookId) {
            // Sync the update to Payment in QuickBooks
            _updateQBPayment(req, res, company, payment, (err, errMsg, qbPayment) => {
                if (err) {
                    return res.json({ status: err, message: errMsg });
                }

                if (qbPayment) {
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
                    customer, invoice
                });
            })
        } else {
            return res.json({ status: Status.Success, message: 'Payment successfully updated.', payment, customer, invoice });
        }

    } catch (error) {
        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
    }

}

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
            return res.json({ status: Status.Error, messages: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

    payment.amountPaid = params.amount ? Number(params.amount) : payment.amountPaid;
    payment.referenceNumber = params.referenceNumber ?? payment.referenceNumber;
    payment.paymentType = params.paymentType ?? payment.paymentType;
    payment.paidAt = params.paidAt ? new Date(moment(params.paidAt).format('YYYY-MM-DD')) : payment.paidAt;
    payment.note = params.note;
    payment.updatedBy = user;
    payment.updatedAt = new Date();
    payment.save();

    return res.json({ status: Status.Success, payment });

}

export const updatePaymentMultipleInvoices = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    let previousDedeuctedBalance: number = 0
    let invoicesPaid: any = []
    let invoiceIds: any = []
    if (params.invoices != undefined) {
        invoicesPaid = params.invoices.split(',')
    }

    if (invoicesPaid.length > 0) {
        invoiceIds = invoicesPaid.map((invoiceID: string) => (
            new ObjectId(invoiceID.trim())
        ))
    }

    Payment.findById(params.paymentId)
        .then((payment: IPayment | null) => {

            if (payment == undefined || payment == null) {
                throw new Error('Invalid payment Id.')
            } else {
                previousDedeuctedBalance = payment.amountPaid
                return payment.updateOne({ amountPaid: params.amount, referenceNumber: params.referenceNumber, paymentType: params.paymentType, paidAt: params.paidAt, invoices: invoiceIds, udpatedBy: user._id, udpatedAt: Date.now() })
            }
        })
        .then((response: any) => {

            return new Promise<void>((resolve, reject) => {

                Customer.findById(params.customerId)
                    .then((customer: ICustomer) => {

                        let newBalance = customer.balance + previousDedeuctedBalance
                        newBalance = newBalance - params.amount

                        customer.updateOne({ balance: newBalance })
                            .then((res: any) => {
                                resolve()
                            })
                            .catch((err: any) => {
                                reject(err)
                            })
                    })
                    .catch((err: any) => {
                        reject(err)
                    })
            })
        })
        .then((result: any) => {
            return Invoice.updateMany({ _id: { $in: invoiceIds } }, { paid: true })
        })
        .then((response: any) => {
            return res.json({ 'status': Status.Success, 'message': "Payment update successfully." })
        })
        .catch((error: any) => {
            if (error != undefined && error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message })
            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
        })
}

export const getPayrollBalance = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;
    const vendors: any = [];
    const employees: any = [];
    let query;

    // Check when startDate and endDate is provided, offset must be required
    if (params.startDate && params.endDate) {
        if (!params.offset) {
            return res.json({ status: Status.Error, meesages: 'Offset is required. when startDate and endDate provided' });
        }

        const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
        const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();
        query = { issuedDate: { $gte: startDate, $lte: endDate } }
    }

    // get job with unpaid technician or contractor
    const invoices: any = await Invoice.find({
        company: company._id,
        isDraft: { $ne: true },
        job: { $ne: null },
        ...query
    }).populate({ path: 'commission' });

    // Iterate all invoices
    for (const invoice of invoices) {
        const invoiceCommission = <IInvoiceCommission>invoice.commission;

        if (invoiceCommission?.technicians) {
            for (const technicianCommission of invoiceCommission.technicians) {
                if (technicianCommission.contractor && !technicianCommission.paid) {
                    const contractor = await Company.findById(technicianCommission.contractor).exec();
                    const contractorEntry = vendors.find((v: any) => v.contractor._id?.toString() === technicianCommission.contractor?.toString());

                    if (contractorEntry) {
                        contractorEntry.commissionTotal += Number(technicianCommission.commissionAmount.toFixed(2));
                        contractorEntry?.invoiceIds?.push(invoice._id);
                    } else {
                        vendors.push({
                            contractor,
                            commissionTotal: Number(technicianCommission.commissionAmount.toFixed(2)),
                            invoiceIds: [invoice._id],
                        });
                    }
                }

                if (technicianCommission.technician && !technicianCommission.contractor && !technicianCommission.paid) {
                    const technician = await User.findById(technicianCommission.technician).exec();
                    const technicianEntry = employees.find((t: any) => t.employee._id?.toString() === technicianCommission.technician?.toString());

                    if (technicianEntry) {
                        technicianEntry.commissionTotal += Number(technicianCommission.commissionAmount.toFixed(2));
                        technicianEntry.invoiceIds.push(invoice._id);
                    } else {
                        employees.push({
                            employee: technician,
                            commissionTotal: Number(technicianCommission.commissionAmount.toFixed(2)),
                            invoiceIds: [invoice._id],
                        });
                    }
                }
            }
        }
    }

    return res.json({
        status: Status.Success,
        startDate: params.startDate,
        endDate: params.endDate,
        offset: params.offset,
        vendors,
        employees
    });

}

export const getPayrollReport = async (req: Request, res: Response) => {


    const params = req.query;
    const company = <ICompany>req.company;
    const vendors: any = [];
    const employees: any = [];
    let techQuery, query: any;

    if (params.startDate && params.endDate) {
        if (!params.offset) {
            return res.json({ status: Status.Error, meesages: 'Offset is required. when startDate and endDate provided' });
        }

        const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
        const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();
        query = { issuedDate: { $gte: startDate, $lte: endDate } }
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

    const invoices = await Invoice.find({
        company: company._id,
        isDraft: { $ne: true },
        ...query
    })
        .populate({
            path: 'job',
            populate: [{
                path: 'type', select: 'title description sku'
            }, {
                path: 'customer', select: 'info.email auth.email profile.displayName contactName'
            }, {
                path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role'
            }, {
                path: 'tasks.technician', select: 'profile auth.email contact'
            }],
        })
        .populate({
            path: 'items.item',
            select: 'name description sku itemCode note cost price',
            populate: [{ path: 'jobType' }]
        })
        .populate({
            path: 'company',
            select: 'info.companyName info.logoUrl info.email permissions.role address.street address.city address.state address.zipCode contact.phone'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
        })
        .populate({
            path: 'estimate',
            select: 'total items note status customer company createdBy'
        })
        .populate({
            path: 'commission',
            select: 'technicians'
        }).exec();

    const invoiceIds = invoices.map(invoice => invoice._id);
    const invoiceCommissions = await InvoiceCommission.find({
        invoice: { $in: invoiceIds }, 'technicians.$[].paid': { $ne: true },
        ...techQuery
    }).populate({ path: 'invoice' });

    for (const invoiceCommission of invoiceCommissions) {
        const invoice = <IInvoice>invoiceCommission.invoice;

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

    return res.json({ status: Status.Success, vendors, employees });
}

export const voidPaymentContractor = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    let payment: IPayment;

    switch (params.type) {
        case 'vendor':
            payment = await Payment.findOne({ _id: params.paymentId, company, __t: 'PaymentVendor' }).exec();

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

        default:
            return res.json({ status: Status.Error, messages: 'Type is required' });
    }

    if (payment && !payment.isVoid) {
        for (const invoice of payment.invoices) {
            const invoiceCommission = await InvoiceCommission.findOne({ invoice }).exec();
            if (invoiceCommission.technicians) {
                for (const technicianCommission of invoiceCommission.technicians) {
                    if (technicianCommission.contractor) {
                        const contractor = await Company.findById(technicianCommission.contractor).exec();
                        contractor.balance += technicianCommission.commissionAmount;
                        await contractor.save();
                    }

                    if (technicianCommission.technician && !technicianCommission.contractor) {
                        const technician = await User.findById(technicianCommission.technician).exec();
                        technician.balance += technicianCommission.commissionAmount;
                        await technician.save();
                    }

                    technicianCommission.paid = false;
                    await invoiceCommission.save()
                }
            }
        }

        payment.isVoid = true;
        await payment.save();
    }

    return res.json({ status: Status.Success, messages: 'Payment void successfully' });
}