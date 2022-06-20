import { Request, Response } from 'express';
import moment from 'moment';
import axios from 'axios';
import * as _ from 'lodash';
import { Status, Messages, PaymentTypes } from '../common/constants';

import { ICustomer, IQBCustomer, Customer } from '../models/Customer';
import { ICompany, Company } from '../models/Company'
import { IInvoice, Invoice, IQBInvoice } from '../models/Invoice';
import { IJob } from '../models/Job';
import { IJobLocation, JobLocation } from '../models/JobLocation';
import { IPayment, IQBPayment, IQBPaymentMethod, IQBPaymentTxnTypes, Payment, PaymentCustomer } from '../models/Payment';
import { _getQbo, _refreshToken } from '../controllers/quickbook';
import { _calculateInvoiceBalance } from '../controllers/payment';

// ===================================
// =======[ QUICKBOOK PAYMENT ]=======
// ===================================

/**
 * Generic function to create QuickBooks Payment,
 * this used by Payment Controller when creating new payment,
 * and this contoller when syncing payments
 */
export const _createQBPayment = async (req: Request, res: Response, company: ICompany, payment: IPayment, next: (error: number, errorMessage: string, qbPayment: IQBPayment) => void) => {

    // Populate the payment to sub object
    await payment
        .populate({ path: 'customer' })
        .populate({
            path: 'invoice',
            populate: [{ path: 'job', populate: [{ path: 'jobLocation' }] }]
        })
        .populate({
            path: 'line.invoice',
            populate: [{ path: 'job', populate: [{ path: 'jobLocation' }] }]
        })
        .execPopulate();

    // Customer of the payment
    const customer = <ICustomer>payment.customer;
    const invoice = <IInvoice>payment.invoice;
    const job = <IJob>invoice?.job;
    const jobLocation = <IJobLocation>job?.jobLocation;

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized, null);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);
        // QB Payment Object
        const qbPaymentEntry: IQBPayment = {
            TxnDate: moment(payment.paidAt).format('YYYY-MM-DD'),
            CustomerRef: {
                value: jobLocation?.quickbookId ?? customer?.quickbookId
            },
            Line: [{
                Amount: payment.amountPaid,
                LinkedTxn: [{
                    TxnId: invoice?.quickbookId,
                    TxnType: IQBPaymentTxnTypes.INVOICE
                }]
            }],
            TotalAmt: payment.amountPaid,
            PaymentRefNum: payment.referenceNumber,
            PaymentMethodRef: {
                value: payment.paymentType ? await _getPaymentMethod(qbo, payment) : null
            },
            PrivateNote: payment.note
        }

        if (payment?.line?.length) {
            const qbPaymentLine = []
            for (const paymentLine of payment.line) {
                const invoiceLine = <IInvoice>paymentLine.invoice;
                if (invoiceLine?.quickbookId) {
                    qbPaymentLine.push(
                        {
                            Amount: paymentLine.amountPaid,
                            LinkedTxn: [{
                                TxnId: invoiceLine?.quickbookId,
                                TxnType: IQBPaymentTxnTypes.INVOICE
                            }]
                        })
                }

                qbPaymentEntry.Line = qbPaymentLine;
            }
        }

        qbo.createPayment(qbPaymentEntry, async (err: any, qbPayment: IQBPayment) => {
            if (err) {
                console.log('== _createQBPayment > qbo.createPayment > ERROR ==');
                console.log('== err.Fault:', err.Fault);
                console.log('== err.Fault?.Error[0]?.Message:', err.Fault?.Error[0]?.Message);
                console.log('== err.fault:', err.fault);
                console.log('== err.fault?.error[0]?.detail:', err.fault?.error[0]?.detail);
                console.log('== err.fault?.error[0]?.message:', err.fault?.error[0]?.message);
                console.log('== paymentId:', payment._id);

                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Detail
                    || err.Fault?.Error[0]?.Message
                    || err.fault?.error[0]?.detail
                    || err.fault?.error[0]?.message
                    || Messages.GenericError,
                    null
                );
            }

            return next(null, null, qbPayment);
        });
    })
}

/**
 * Generic function to update QuickBooks Payment,
 * this used by Payment Controller when updating payment
 */
export const _updateQBPayment = async (req: Request, res: Response, company: ICompany, payment: IPayment, next: (error: number, errorMessage: string, qbPayment: IQBPayment) => void) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized, null);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Get the QB Payment object based on payment quickbookId
        qbo.getPayment(payment.quickbookId, async (err: any, qbPayment: IQBPayment) => {

            if (!qbPayment) {
                return next(null, null, null);
            }

            // Set the new value from the updated payment object
            qbPayment.TotalAmt = payment.amountPaid;
            qbPayment.PaymentRefNum = payment.referenceNumber;
            qbPayment.PaymentMethodRef = qbPayment.PaymentMethodRef ?? { value: null };
            qbPayment.PaymentMethodRef.value = payment.paymentType ? await _getPaymentMethod(qbo, payment) : null;
            qbPayment.TxnDate = moment(payment.paidAt).format('YYYY-MM-DD');
            qbPayment.PrivateNote = payment.note;

            if (qbPayment?.Line?.length) {
                if (payment?.line?.length) {
                    const qbPaymentLine: any = [];
                    for (const paymentLine of payment.line) {
                        const invoiceLine = <IInvoice>paymentLine.invoice;
                        if (invoiceLine?.quickbookId) {
                            qbPaymentLine.push({
                                Amount: paymentLine.amountPaid,
                                LinkedTxn: [{
                                    TxnId: invoiceLine?.quickbookId,
                                    TxnType: IQBPaymentTxnTypes.INVOICE
                                }]
                            })
                        }

                        qbPayment.Line = qbPaymentLine;
                    }
                } else {
                    qbPayment.Line[0].Amount = payment.amountPaid;
                }
            }

            // Update QB Payment
            qbo.updatePayment(qbPayment, async (err: any, qbPayment: IQBPayment) => {
                if (err) {
                    return next(
                        Status.Error,
                        err?.Fault?.Error[0]?.Detail
                        || err?.Fault?.Error[0]?.Message
                        || err?.fault?.error[0]?.detail
                        || err?.fault?.error[0]?.message
                        || Messages.GenericError,
                        null
                    );
                }

                return next(null, null, qbPayment);
            });
        });
    });

}

/**
* To syncing payments from BC to QB only
*/
export const syncQBPayments = async (req: Request, res: Response) => {

    const updatedPayments: { _id: string, referenceNumber: string, quickbookRefNum: string }[] = [];

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, req.company, async (err, errMsg, company) => {
        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        /**
         * Retrieve all payments of this company from Database,
         * that doesn't have quickbookId 
         */
        const payments = await PaymentCustomer.find({
            company: company._id,
            quickbookId: null
        }).sort({ paidAt: 1 }).populate({ path: 'invoice' });

        // Return immediately when no payments to be synced
        if (payments.length <= 0) {
            return res.json({ status: Status.Success, message: 'No payments to be synced.' });
        }

        // Find QB payments start from the first payments date
        qbo.findPayments([
            { field: 'TxnDate', value: moment(payments[0]?.paidAt).subtract(1, 'days').format('YYYY-MM-DD'), operator: '>=' }
        ], async (err: any, data: any) => {
            if (err) {
                return res.json({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                })
            }

            const qbPayments: IQBPayment[] = data?.QueryResponse?.Payment;

            // Iterate all payments from DB
            for (const payment of payments) {
                const invoice = <IInvoice>payment.invoice;

                let existQBPayment: IQBPayment;

                /**
                 * Find exist QB Payment,
                 * need to check several things because payment doesn't have
                 * one unique reference number
                 */
                for (const qbPayment of qbPayments) {
                    if (
                        !moment(payment.paidAt).utc().isSame(new Date(qbPayment.TxnDate), 'day')
                        || (payment.referenceNumber
                            && payment.referenceNumber !== qbPayment.PaymentRefNum)
                        || (payment.quickbookRefNum
                            && Buffer.from(payment.quickbookRefNum, 'base64').toString() !== qbPayment.MetaData?.CreateTime)
                    ) {
                        // Skip qb payment because either date, referenceNumber, or qbRefNum is different
                        continue;
                    }

                    for (const qbPLine of qbPayment.Line) {
                        if (payment?.amountPaid !== qbPLine?.Amount) {
                            // Skip qb payment because amountPaid is different
                            continue;
                        }

                        for (const line of qbPLine?.LineEx?.any) {
                            if (line?.value?.Name === 'txnReferenceNumber' && line?.value?.Value === invoice?.invoiceId) {
                                existQBPayment = qbPayment;
                                break;
                            }
                        }
                        if (existQBPayment) { break; };
                    }
                    if (existQBPayment) { break; };
                }

                if (!existQBPayment) {
                    // Create payment on QB
                    _createQBPayment(req, res, company, payment, (err, errMsg, qbPayment) => {
                        if (qbPayment) {
                            // QB Payment created, update DB Payment quickbookId
                            Payment.findByIdAndUpdate(payment, { quickbookId: qbPayment.Id }).exec();
                        }
                    })
                } else {
                    if (payment.quickbookId !== existQBPayment.Id) {
                        // QB Payment exist, update DB Payment quickbookId directly
                        Payment.findByIdAndUpdate(payment, { quickbookId: existQBPayment.Id }).exec();

                        updatedPayments.push({ _id: payment._id, referenceNumber: payment.referenceNumber, quickbookRefNum: payment.quickbookRefNum });
                    }
                }
            }

            company.qbSync.paymentsSynced = true;
            company.qbSync.paymentsSyncedAt = new Date();
            company.save();

            return res.json({ status: Status.Success, message: 'Payments synced successfully.', updatedPayments });
        });
    })

}

/**
 * Called by quickbook controller when handle webhook from Quickbooks
 */
export const createBCPayment = async (req: Request, res: Response, company: ICompany, qbPaymentId: string, next: (error: number, errorMessage: string, payments: IPayment[]) => void) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        const paymentEntries: IPayment[] = [];

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Get QB Payment by ID sent through webhook
        qbo.getPayment(qbPaymentId, async (err: any, qbPayment: IQBPayment) => {
            if (err) {
                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Detail
                    || err.Fault?.Error[0]?.Message
                    || err.fault?.error[0]?.detail
                    || err.fault?.error[0]?.message
                    || Messages.GenericError,
                    null
                );
            }

            // Get QB Customer to know if it is a Customer or Job
            qbo.getCustomer(qbPayment.CustomerRef?.value, async (err: any, qbCustomer: IQBCustomer) => {
                let customer: ICustomer;
                if (!qbCustomer.Job) {
                    // Get BC Customer by QB Payment's Customer quickbookId
                    customer = await Customer.findOne({ quickbookId: qbCustomer.Id, 'info.email': qbCustomer.PrimaryEmailAddr?.Address });
                } else {
                    /**
                     * Invoice was recorded to Customer Job Location in QB,
                     * Get the Customer ID from the Job Location
                     */
                    const jobLocation = await JobLocation.findOne({ quickbookId: qbCustomer.Id, companyId: company._id });
                    if (jobLocation) {
                        customer = await Customer.findById(jobLocation.customerId);
                    }
                }

                // No customer found, return directly
                if (!customer) {
                    return next(null, null, []);
                }

                // Get QB Payment Method by QB Payment's Payment Method ID
                qbo.getPaymentMethod(qbPayment.PaymentMethodRef?.value, async (err: any, qbPaymentMethod: { Name: string }) => {

                    // Iterate all invoice lines on the payment
                    for (const line of qbPayment.Line) {
                        // Get BC Invoice by QB line's Invoice quickbookId
                        const qbInvoiceTxn = line.LinkedTxn.find(txn => txn.TxnType === IQBPaymentTxnTypes.INVOICE);
                        const invoice = await Invoice.findOne({ quickbookId: qbInvoiceTxn.TxnId, company });

                        const existPayment = await PaymentCustomer.findOne({
                            company: company._id,
                            customer: customer._id,
                            invoice: invoice._id,
                            amountPaid: line.Amount,
                            referenceNumber: qbPayment.PaymentRefNum,
                        });

                        // BC Invoice found, proceed the payment for the invoice
                        if (invoice && !existPayment) {
                            paymentEntries.push(new PaymentCustomer({
                                customer,
                                invoice,
                                amountPaid: line.Amount,
                                referenceNumber: qbPayment.PaymentRefNum,
                                paymentType: qbPaymentMethod?.Name,
                                paidAt: qbPayment.TxnDate ? new Date(qbPayment.TxnDate) : Date.now(),
                                company: company._id,
                                quickbookRefNum: Buffer.from(qbPayment.MetaData?.CreateTime).toString('base64'),
                                quickbookId: qbPayment.Id,
                                createdBy: company.admin,
                                createdAt: Date.now()
                            }));
                        }
                    }

                    // No payment to create, return directly
                    if (!paymentEntries.length || paymentEntries.length <= 0) {
                        return next(null, null, []);
                    }

                    if (paymentEntries.length > 0) {
                        // Create all payment entries on one shot
                        await PaymentCustomer.create(paymentEntries, async (err, payments) => {

                            if (payments.length > 0) {
                                // Iterate all created payments and calculate invoices
                                for (const payment of payments) {
                                    // Handle invoice balance due, underpayment, and overpayment
                                    await _calculateInvoiceBalance(<IInvoice>payment.invoice, <ICustomer>payment.customer, payment.amountPaid);
                                }
                            }

                            return next(null, null, payments);
                        });
                    }
                })
            })
        })
    })

}


// PRIVATE METHODS

const _getPaymentMethod = (qbo: any, payment: IPayment): Promise<string> => {

    return new Promise((resolve, reject) => {

        qbo.findPaymentMethods({ Name: payment.paymentType }, async (err: any, data: any) => {
            if (err) {
                // TODO: handle if something is error
                // return next(
                //     Status.Error,
                //     err.Fault?.Error[0]?.Message
                //         || err.fault?.error[0]?.detail
                //         || err.fault?.error[0]?.message
                //         || Messages.GenericError,
                //     null);
            }

            if (data?.QueryResponse?.PaymentMethod?.length > 0) {
                resolve(data?.QueryResponse?.PaymentMethod[0]?.Id);
            }

            // Payment Method not found, construct QB Payment Method Object
            const qbPaymentMethodEntry: IQBPaymentMethod = {
                Name: payment.paymentType,
                Type: payment.paymentType === PaymentTypes.CREDIT_DEBIT_CARD ? 'CREDIT_CARD' : 'NON_CREDIT_CARD'
            };

            // Create new QB Payment Method
            qbo.createPaymentMethod(qbPaymentMethodEntry, async (err: any, qbPaymentMethod: IQBPaymentMethod) => {
                if (err) {
                    // TODO: handle if something is error?
                    // return next(
                    //     Status.Error,
                    //     err.Fault?.Error[0]?.Detail
                    //         || err.Fault?.Error[0]?.Message
                    //         || err.fault?.error[0]?.detail
                    //         || err.fault?.error[0]?.message
                    //         || Messages.GenericError,
                    //     null
                    // );
                }

                resolve(qbPaymentMethod?.Id);
            })
        });
    })

}

export const _transferQBPayments = async (req: Request, res: Response, company: ICompany, unusedCustomers: ICustomer[], currentCustomer: ICustomer) => {

    // Initiate node-quickbooks object with the refreshed company token
    const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

    // Get old QB Customer
    qbo.getCustomer(currentCustomer.quickbookId, async (err: any, currentQBCustomer: IQBCustomer) => {

        // Make sure the merged base customer Active
        currentQBCustomer.Active = true;

        qbo.updateCustomer(currentQBCustomer, async (err: any, qbCustomer: IQBCustomer) => {

            if (qbCustomer) {
                // Iterate all unused customers
                for (const unusedCustomer of unusedCustomers) {
                    qbo.getCustomer(unusedCustomer.quickbookId, async (err: any, unusedQBCustomer: IQBCustomer) => {

                        // Find the payments of unused customer
                        qbo.findPayments([
                            { field: 'CustomerRef', value: unusedCustomer?.quickbookId }
                        ], async (err: any, data: any) => {
                            const qbPayments: IQBPayment[] = data?.QueryResponse?.Payment

                            if (qbPayments?.length) {
                                for (const qbPayment of qbPayments) {
                                    if (qbPayment && unusedQBCustomer?.Active) {
                                        // Handle linked transaction invoice in payment
                                        if (qbPayment?.Line.length) {
                                            for (const paymentLine of qbPayment?.Line) {
                                                for (const linkedTxn of paymentLine.LinkedTxn) {
                                                    if (linkedTxn.TxnType === IQBPaymentTxnTypes.INVOICE) {
                                                        qbo.getInvoice(linkedTxn.TxnId, async (err: any, qbInvoice: IQBInvoice) => {
                                                            if (qbInvoice) {
                                                                // qbInvoice.CustomerRef = qbInvoice?.CustomerRef ?? {};
                                                                qbInvoice.CustomerRef.value = currentCustomer?.quickbookId;
                                                                qbInvoice.CustomerRef.name = currentCustomer?.profile?.displayName;
                                                                qbInvoice.BillEmail = qbInvoice.BillEmail ?? {};
                                                                qbInvoice.BillEmail.Address = currentCustomer?.info?.email;
                                                            }

                                                            qbo.updateInvoice(qbInvoice, async (err: any, qbInvoice: IQBInvoice) => { })
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                        // End of handle linked transaction invoice in payment

                                        // This item is required
                                        qbPayment.Id;
                                        // This item is required
                                        qbPayment.SyncToken;
                                        // This item is required
                                        qbPayment.Line = qbPayment.Line;
                                        // qbPayment.CustomerRef = qbPayment?.CustomerRef ?? {};
                                        qbPayment.CustomerRef.value = currentCustomer?.quickbookId;
                                        qbPayment.CustomerRef.name = currentCustomer?.profile?.displayName;
                                        qbPayment.TotalAmt = qbPayment.TotalAmt;
                                        qbPayment.CurrencyRef = qbPayment.CurrencyRef;
                                        qbPayment.PaymentRefNum = qbPayment.PaymentRefNum;
                                        qbPayment.PaymentMethodRef = qbPayment.PaymentMethodRef;
                                        qbPayment.TxnDate = qbPayment.TxnDate;
                                        qbPayment.PrivateNote = qbPayment.PrivateNote;
                                        // Update payment in QB 
                                        qbo.updatePayment(qbPayment, async (err: any, qbPayment: IQBPayment) => {

                                        })
                                    }
                                }
                            }
                        })
                    })
                }
            }

            return;
        })
    })
    // })
}

export const _getQBPayments = async (req: Request, res: Response, company: ICompany, customer: ICustomer): Promise<IQBPayment[]> => {
    return new Promise((resolve, reject) => {
        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.findPayments([
            { field: 'CustomerRef', value: customer?.quickbookId }
        ], async (err: any, data: any) => {
            if (err) {
                reject(
                    new Error(
                        err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                    ));
            }

            resolve(<IQBPayment[]>data?.QueryResponse?.Payment);
        });
    });

}

export const _countQBPayments = async (company: ICompany, customer: ICustomer): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);
        qbo.findPayments([
            { field: 'CustomerRef', value: customer?.quickbookId },
            { field: 'limit', value: 1 }
            // { count: true }
        ], async (err: any, data: any) => {
            const qbPayment = data?.QueryResponse?.Payment;
            if (err) {
                reject(
                    new Error(
                        err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                    )
                );
            }

            resolve(<boolean>qbPayment ? true : false);
        });
    })
}

export const _deleteQBPayment = async (req: Request, res: Response, company: ICompany, payment: IPayment): Promise<any> => {
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
        }

        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);
        qbo.deletePayment(payment.quickbookId, async (err: any, response: { Payment: { status: string } }) => {
            if (err || !response) {
                return res.json({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Detail
                        || err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                });
            }

            if (response?.Payment?.status === 'Deleted') {
                payment.quickbookId = null;
                payment.save();

                if (company?.qbSync?.paymentsSynced) {
                    company.qbSync.paymentsSyncedAt = new Date();
                    company.save();
                }

                return;
            }
        });
    });
}

export const _voidPayment = async (req: Request, res: Response, company: ICompany, payment: IPayment): Promise<any> => {

    const qbApiUrl = process.env.QB_API_URL || 'https://sandbox-quickbooks.api.intuit.com/';

    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            throw new Error(errMsg);
        }

        if (err === 400) {
            Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            throw new Error(Messages.QBUnAuthorized);
        }


        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Get quickbook invoice
        qbo.getPayment(payment.quickbookId, async (err: any, qbPayment: IQBPayment) => {

            if (!qbPayment) {
                return;
            }

            // Void invoice in quickbook
            return await axios({
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${company.qbAccessToken}`
                },
                method: 'post',
                url: `${qbApiUrl}/v3/company/${company.realmId}/payment?operation=update&include=void&minorversion=65`,
                data: { SyncToken: qbPayment.SyncToken, Id: qbPayment.Id, sparse: true },
            })
                .then(response => response)
                .catch(err => {
                    throw new Error(err.Fault?.Error[0]?.Detail
                        || err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                    );
                });
        });
    });
}

export const getQBPayment = async (req: Request, res: Response) => {
    return new Promise((resolve, reject) => {
        const params = req.query;
        const company = <ICompany>req.company
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.getPayment(params.quickbookId, async (err: any, qbPayment: IQBPayment) => {
            if (err) {
                reject(err)
            } else {
                resolve(qbPayment)
            }
        });
    })
    .then((response: any) => {
        return res.json({ 'status': Status.Success, 'message': response })
    })
    .catch((error: any) => {
        if (error != undefined && error.message != undefined) {
            return res.json({ 'status': Status.Error, 'message': error.message })
        } else {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }
    })
}