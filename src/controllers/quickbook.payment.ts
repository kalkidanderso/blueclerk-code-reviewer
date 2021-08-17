import { Request, Response } from 'express';
import { Status, Messages, PaymentTypes } from '../common/constants';

import { ICustomer, Customer } from '../models/Customer';
import { ICompany, Company } from '../models/Company'
import { IInvoice, Invoice } from '../models/Invoice';
import { IJob } from '../models/Job';
import { IJobLocation } from '../models/JobLocation';
import { IPayment, IQBPayment, IQBPaymentMethod, IQBPaymentTxnTypes, Payment } from '../models/Payment';
import { _getQbo, _refreshToken } from '../controllers/quickbook';
import { _calculateInvoiceBalance } from '../controllers/payment';

// ===================================
// =======[ QUICKBOOK PAYMENT ]=======
// ===================================

export const _createQBPayment = async (req: Request, res: Response, company: ICompany, payment: IPayment, next: (error: number, errorMessage: string, qbPayment: IQBPayment) => void) => {

    // Populate the payment to sub object
    await payment
        .populate({ path: 'customer' })
        .populate({
            path: 'invoice',
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

        // Get QB Payment Method ID
        const paymentMethodId = await _getPaymentMethod(qbo, payment);

        // QB Payment Object
        const qbPaymentEntry: IQBPayment = {
            TxnDate: payment.paidAt,
            CustomerRef: {
                value: jobLocation?.quickbookId || customer.quickbookId
            },
            Line: [{
                Amount: payment.amountPaid,
                LinkedTxn: [{
                    TxnId: invoice.quickbookId,
                    TxnType: IQBPaymentTxnTypes.INVOICE
                }]
            }],
            TotalAmt: payment.amountPaid,
            PaymentRefNum: payment.referenceNumber,
            PaymentMethodRef: {
                value: paymentMethodId
            }
        };

        // Create QB Payment
        qbo.createPayment(qbPaymentEntry, async (err: any, qbPayment: IQBPayment) => {
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

            return next(null, null, qbPayment);
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

            // Get BC Customer by QB Payment's Customer quickbookId
            const customer = await Customer.findOne({ quickbookId: qbPayment.CustomerRef?.value });

            // Get QB Payment Method by QB Payment's Payment Method ID
            qbo.getPaymentMethod(qbPayment.PaymentMethodRef?.value, async (err: any, qbPaymentMethod: { Name: string }) => {

                // Iterate all invoice lines on the payment
                for (const line of qbPayment.Line) {
                    // Get BC Invoice by QB line's Invoice quickbookId
                    const invoice = await Invoice.findOne({ quickbookId: line.LinkedTxn[0]?.TxnId, company });

                    // BC Invoice found, proceed the payment for the invoice
                    if (invoice) {
                        paymentEntries.push(new Payment({
                            customer,
                            invoice,
                            amountPaid: line.Amount,
                            referenceNumber: qbPayment.PaymentRefNum,
                            paymentType: qbPaymentMethod?.Name,
                            paidAt: qbPayment.TxnDate ? new Date(qbPayment.TxnDate) : Date.now(),
                            company,
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
                    await Payment.create(paymentEntries, async (err, payments) => {

                        // Iterate all created payments and calculate invoices
                        for (const payment of payments) {
                            // Handle invoice balance due, underpayment, and overpayment
                            await _calculateInvoiceBalance(<IInvoice>payment.invoice, <ICustomer>payment.customer, payment.amountPaid);
                        }

                        return next(null, null, payments);
                    });
                }
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
