import { Request, Response } from 'express';
import { Status, Messages, Role } from '../common/constants';
import { IUser } from '../models/User';
import { ICompany, Company } from '../models/Company';
import { IPaymentTerm, DefaultPaymentTerms, IQBPaymentTerm, PaymentTerm } from '../models/PaymentTerm';
import { _getQbo, _refreshToken } from '../controllers/quickbook';
import * as Sentry from '@sentry/node';

// =========================================
// =======[ QUICKBOOKS PAYMENT TERM ]=======
// =========================================

export const _syncQBDefaultPaymentTerms = async (req: Request, res: Response, company: ICompany) => {

    // Collect all default payment terms name in one array
    const names = DefaultPaymentTerms.map(term => term.name);

    // Search default payment terms of the company
    const defaultTerms = await PaymentTerm.find({
        company: company._id,
        isActive: true,
        name: { $in: names }
    });

    // Iterate the default terms to check if it is synced or not
    for (const paymentTerm of defaultTerms) {
        if (!paymentTerm.quickbookId) {
            // Payment term doesn't have quickbookId, find/create it on QB
            _createQBPaymentTerm(req, res, company, paymentTerm, async (err: any, errMsg: any, qbPaymentTerm: IQBPaymentTerm) => {
                if (qbPaymentTerm) {
                    // Update quickbookId of our Payment Term
                    PaymentTerm.findByIdAndUpdate(paymentTerm._id, { quickbookId: qbPaymentTerm.Id }).exec();
                }
            });
        }
    }

};

export const _createQBPaymentTerm = async (req: Request, res: Response, company: ICompany, paymentTerm: IPaymentTerm, next: (error: number, errorMessage: string, qbPaymentTerm: IQBPaymentTerm) => void) => {

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

        // Find if QB Payment Term is exist
        qbo.findTerms({ Name: paymentTerm.name }, async (err: any, data: any) => {
            if (err) {
                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError,
                    null);
            }

            if (data?.QueryResponse?.Term?.length > 0) {
                // Term with same name found in QB, use that instead
                return next(null, null, <IQBPaymentTerm>data?.QueryResponse?.Term[0]);
            } else {
                // Term not found, create new one
                // Construct QB Payment Term
                const qbPaymentTermEntry: IQBPaymentTerm = {
                    Name: paymentTerm.name,
                    DueDays: paymentTerm.dueDays,
                    Active: paymentTerm.isActive,
                    DiscountDays: 0
                };
        
                qbo.createTerm(qbPaymentTermEntry, async (err: any, qbPaymentTerm: IQBPaymentTerm) => {
                    if (err) {
                        return next(
                            Status.Error,
                            err.Fault?.Error[0]?.Message
                                || err.fault?.error[0]?.detail
                                || err.fault?.error[0]?.message
                                || Messages.GenericError,
                            null
                        );
                    }
        
                    return next(null, null, qbPaymentTerm);
                });
            }
        });
    });

};

export const syncQBPaymentTerms = async (req: Request, res: Response) => {

    const user = <IUser>req.user;
    const paymentTermsToCreate: IPaymentTerm[] = [];
    const createdPaymentTerms: { _id: string, name: string }[] = [];
    const updatedPaymentTerms: { _id: string, name: string }[] = [];

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, req.company, async (err, errMsg, company) => {
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

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Find payment terms from DB
        const paymentTerms = await PaymentTerm.find({ company: company._id });

        qbo.findTerms({}, async (err: any, data: any) => {
            if (err) {
                return res.json({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                });
            }

            const qbPaymentTerms: IQBPaymentTerm[] = data?.QueryResponse?.Term;

            // Iterate all payment terms from QB
            for (const paymentTerm of paymentTerms) {
                // Check if there any payment term on DB that not on QB yet
                const qbPaymentTerm = qbPaymentTerms?.find((qbPaymentTerm: IQBPaymentTerm) => qbPaymentTerm.Name?.toLowerCase() === paymentTerm.name?.toLowerCase());

                // Payment Term not exist on QB, create it
                if (!qbPaymentTerm) {
                    _createQBPaymentTerm(req, res, company, paymentTerm, async (err, errMsg, qbPaymentTerm) => {
                        if (qbPaymentTerm) {
                            // QB Payment Term created, update DB Payment Term's quickbookId
                            PaymentTerm.findByIdAndUpdate(paymentTerm._id, { quickbookId: qbPaymentTerm.Id }).exec();
                        }
                    });
                } else {
                    // QB Payment Term found, update DB Payment Term's quickbookId directly
                    PaymentTerm.findByIdAndUpdate(paymentTerm._id, { quickbookId: qbPaymentTerm.Id }).exec();
                }
            }

            // Iterate all QuickBooks payment terms
            for (const qbPaymentTerm of qbPaymentTerms) {
                // Check if there any payment term on QB that not on DB yet
                const paymentTerm = paymentTerms.find(paymentTerm => paymentTerm.name?.toLowerCase() === qbPaymentTerm.Name?.toLowerCase());

                if (paymentTerm) {
                    if (paymentTerm.quickbookId !== qbPaymentTerm.Id) {
                        PaymentTerm.findByIdAndUpdate(paymentTerm._id, { quickbookId: qbPaymentTerm.Id }).exec();

                        updatedPaymentTerms.push({ _id: paymentTerm._id, name: paymentTerm.name });
                    }
                } else {
                    // Payment Term not found, create it
                    paymentTermsToCreate.push(new PaymentTerm({
                        name: qbPaymentTerm.Name,
                        dueDays: qbPaymentTerm.DueDays,
                        isActive: qbPaymentTerm.Active,
                        company: company._id,
                        createdBy: user._id,
                        quickbookId: qbPaymentTerm.Id
                    }));
                }
            }

            if (paymentTermsToCreate.length > 0) {
                // Iterate payment term to list the created payment terms
                for (const paymentTerm of paymentTermsToCreate) {
                    createdPaymentTerms.push({ _id: paymentTerm._id, name: paymentTerm.name });
                }

                // Create all payment terms to DB at once
                PaymentTerm.create(paymentTermsToCreate);
            }

            company.qbSync.paymentTermSynced = true;
            company.qbSync.paymentTermSynedAt = new Date();
            company.save();

            return res.json({ status: Status.Success, message: 'Payment Term synced successfully.', createdPaymentTerms, updatedPaymentTerms });
        });
    });

};

export const findQBAllTerms = async (req: Request, res: Response) => {

    return new Promise((resolve, reject) => {
        const params = req.query;
        const company = <ICompany>req.company;
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.findTerms([
            // { field: 'Name', value: params.name }
            { field: 'fetchAll', value: true }
        ], async (err: any, data: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(data?.QueryResponse?.Term);
            }
        });
    })
        .then((data: any) => {
            return res.json({ status: Status.Success, data: data ?? null });
        })
        .catch((error: any) => {
            Sentry.captureException(error);
            return res.json({ status: Status.Error, message: error ?? Messages.GenericError });
        });
};
