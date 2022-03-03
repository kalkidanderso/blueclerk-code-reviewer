import { Request, Response } from 'express'
import { ObjectId } from 'mongodb'
import moment from 'moment'

import { Status, Messages, InvoiceStatus, DefaultCommission } from '../common/constants'
import { Company, ICompany } from '../models/Company'
import { IUser, User } from '../models/User'
import { Invoice, IInvoice } from '../models/Invoice'
import { Payment, IPayment, PaymentVendor, PaymentEmployee } from '../models/Payment'
import { Customer, ICustomer } from '../models/Customer'
import { _createQBPayment, _updateQBPayment } from './quickbook.payment'
import { Employee } from '../models/Employee'
import { Contract } from '../models/Contract'
import { IJob, Job } from '../models/Job'


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

export const getPaymentsByContractor = (req: Request, res: Response) => {

    let query;
    const params = req.query;
    const company = <ICompany>req.company;
    const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();

    if (!params.id) {
        return res.json({ 'status': Status.Error, 'message': 'Id is required on contractor type' })
    }

    if (startDate && endDate) {
        query = { startDate: { $gte: startDate, $lte: endDate } }
    }

    switch (params.type) {
        case 'vendor':
            const vendorQuery = { company, vendor: params.id, ...query }

            PaymentVendor.find(vendorQuery)
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
                        return res.json({ 'status': Status.Error, 'message': error.message });
                    } else {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }
                });
            break;
        case 'employee':
            const employeeQuery = { company, employee: params.id, ...query }

            PaymentEmployee.find(employeeQuery)
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
                        return res.json({ 'status': Status.Error, 'message': error.message });
                    } else {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }
                });
            break;
        default:
            return res.json({ 'status': Status.Error, 'message': 'Type is required' })
    }

}

/**
 * Create payment for single invoice
 */
export const createPayment = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    const payments: IPayment[] = [];

    // Construct payment entry
    const paymentEntry = {
        amountPaid: params.amount,
        referenceNumber: params.referenceNumber || new ObjectId().toString().substring(5, 20),
        paymentType: params.paymentType,
        paidAt: params.paidAt ? moment(params.paidAt).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        note: params.note,
        company,
        createdBy: user,
        createdAt: Date.now()
    };

    switch (params.type) {
        case 'vendor':
            if (!params.vendorId) {
                return res.json({ status: Status.Error, message: 'vendorId is required on vendor type' });
            }

            const contractor = await Company.findById(params.vendorId).exec();

            if (!contractor) {
                return res.json({ status: Status.Error, message: 'Vendor not found.' });
            }

            const paymentContractor = new PaymentVendor({
                contractor,
                ...paymentEntry
            });

            paymentContractor.save();
            payments.push(paymentContractor);

            return res.json({ status: Status.Success, message: 'Payment successfully created.', payments });

        case 'employee':
            if (!params.employeeId) {
                return res.json({ status: Status.Error, message: 'employeeId is required on employee type' });
            }

            const employee = await Employee.findById(params.employeeId).exec();

            if (!employee) {
                return res.json({ status: Status.Error, message: 'Employee not found.' });
            }

            const paymentEmployee = new PaymentEmployee({
                employee,
                ...paymentEntry
            });

            paymentEmployee.save();
            payments.push(paymentEmployee);

            return res.json({ status: Status.Success, message: 'Payment successfully created.', payments });

        case 'customer':
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
            const payment = new Payment({
                customer,
                invoice,
                ...paymentEntry
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

        default:
            return res.json({ status: Status.Error, message: 'Type must be selected.' });
    }
}

export const createPaymentContractor = async (req: Request, res: Response) => {

    let payment;
    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    const invoiceIds = params.invoiceIds?.length ? JSON.parse(params.invoiceIds) : [];
    if (!params.invoiceIds && !params.startDate && !params.endDate) {
        return res.json({ statstus: Status.Error, message: 'One of Id or Start date and end date are provided' });
    }

    const query:any = {$or: [{_id: {$in: invoiceIds}}]};
    const startDate = moment(params.startDate).startOf('day').utc().format();
    const endDate = moment(params.endDate).endOf('day').utc().format();

    if (params.startDate && params.endDate) {
        query.$or.push({issuedDate: { $gte: startDate, $lte: endDate }})
    }

    // Check is vendor is in the job or not
    const paymentEntry = {
        amountPaid: params.amount,
        referenceNumber: params.referenceNumber || new ObjectId().toString().substring(5, 20),
        paymentType: params.paymentType,
        paidAt: params.paidAt ? moment(params.paidAt).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        note: params.notes,
        company,
        createdBy: user,
        createdAt: Date.now()
    };

    switch (params.type) {
        case 'vendor':
            const contractor = await Company.findById(params.id).exec();
            if (!contractor) {
                return res.json({ status: Status.Error, messages: 'Vendor not found' });
            }

            const contractorJobs = await Job.find({ 'tasks.contractor': contractor._id }).exec();
            if (!contractorJobs?.length) {
                return res.json({ status: Status.Error, message: 'Vendor is not in any jobs of invoices' });
            }

            const contractorJobIds = contractorJobs.map(job => job._id);
            const contractorInvoices = await Invoice.find({
                job: { $in: contractorJobIds },
                ...query
            }).exec();

            if (!contractorInvoices?.length) {
                return res.json({ status: Status.Error, message: 'No invoice found' });
            }

            let invoiceTotal: number = 0;
            const contractorInvoiceIds = [];
            for (const invoice of contractorInvoices) {
                invoiceTotal += invoice.total;
                contractorInvoiceIds.push(invoice._id);
            }

            const paymentVendor = new PaymentVendor({
                contractor,
                invoices: contractorInvoiceIds,
                startDate: params.startDate ? moment(params.startDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
                endDate: params.endDate ? moment(params.endDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
                ...paymentEntry
            });

            paymentVendor.save();
            for (const job of contractorJobs) {
                const task = job.tasks.find(task => task?.contractor?.toString() === contractor._id?.toString());
                task.paid = true;
                task.paidAt = paymentVendor.paidAt;

                job.save();
            }

            const contractorCommission = invoiceTotal * (contractor?.commission ?? DefaultCommission.VENDOR_COMMISSION / 100);
            const contractorBalance = contractor.balance - contractorCommission
            contractor.balance = contractorBalance < 0 ? 0 : contractorBalance;
            contractor.save();

            return res.json({ status: Status.Success, message: 'Payment successfully created.', payment: paymentVendor });

        case 'employee':
            const employee = await User.findById(params.id).exec();
            if (!employee) {
                return res.json({ status: Status.Error, messages: 'Employee not found' });
            }

            const employeeJobs = await Job.find({ 'tasks.technician': employee._id }).exec();
            if (!employeeJobs?.length) {
                return res.json({ status: Status.Error, message: 'Employee is not in any jobs of invoices' });
            }

            const employeeJobIds = employeeJobs.map(job => job._id);
            const employeeInvoices = await Invoice.find({
                job: { $in: employeeJobIds },
                $or: [{ _id: { $in: invoiceIds } }, { issuedDate: { $gte: startDate, $lte: endDate } }]
            }).exec();

            if (!employeeInvoices.length) {
                return res.json({ status: Status.Error, message: 'No invoice found' });
            }

            const employeeInvoiceIds = [];
            let totalInvoice = 0;
            for (const invoice of employeeInvoices) {
                totalInvoice += invoice.total;
                employeeInvoiceIds.push(invoice._id);
            }

            const paymentEmployee = new PaymentEmployee({
                employee,
                invoices: employeeInvoiceIds,
                startDate: params.startDate ? moment(params.startDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
                endDate: params.endDate ? moment(params.endDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
                ...paymentEntry
            });

            paymentEmployee.save();
            for (const job of employeeJobs) {
                const task = job?.tasks.find(task => task?.technician?.toString() === employee._id?.toString());
                task.paid = true;
                task.paidAt = paymentEmployee.paidAt;
                job.save();
            }

            const employeeCommission = totalInvoice * (employee.commission ?? DefaultCommission.EMPLOYEE_COMMISSION / 100);
            const employeeBalance = employee.balance - employeeCommission
            employee.balance = employeeBalance < 0 ? 0 : employeeBalance;
            employee.save();

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

    const company = <ICompany>req.company;
    const contracts = await Contract.find({ company: company }).exec();
    const contractorIds = contracts.map(contracts => contracts.contractor);

    const contractors = await Company.find({ _id: { $in: [...new Set(contractorIds)] } }).exec();
    const technicians = await Employee.find({ company }).exec();

    return res.json({ status: Status.Success, contractors, technicians });
}