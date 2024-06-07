import { Request, Response } from 'express';
import { Status, Messages, Role } from '../common/constants';

import { IContact } from '../common/contact';
import { Contact } from '../models/Contact';
import { IUser } from '../models/User';
import { ICompany, Company } from '../models/Company';
import { Customer, ICustomer, IQBCustomer } from '../models/Customer';
import { JobLocation, IJobLocation } from '../models/JobLocation';
import { CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer';
import { _getQbo, _refreshToken } from '../controllers/quickbook';
import { NotificationServiceTicket } from '../models/NotificationDiscriminator';
import { NotificationTypes } from '../models/Notification';
import { CustomerAdmin, ICustomerAdmin } from '../models/CustomerAdmin';
import * as Sentry from '@sentry/node';

const QuickBooks = require('node-quickbooks');
const OAuthClient = require('intuit-oauth');

// =====================================
// =======[ QUICKBOOKS CUSTOMER ]=======
// =====================================

const _getQBCustomers = (qbo: any): Promise<IQBCustomer[]> => {

    return new Promise((resolve, reject) => {
        qbo.findCustomers({}, (err: any, data: any) => {
            if (err) {
                reject({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                });
            }

            resolve(<IQBCustomer[]>data?.QueryResponse?.Customer);
        });
    });

};

const _getCustomers = (req: Request, res: Response, company: ICompany, next: (req: Request, res: Response, error: number, errorMessage: string, customers: any) => void) => {

    const { QB_ENVIRONMENT, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

    let qbo = new QuickBooks(QB_CLIENT_ID,
        QB_CLIENT_SECRET,
        company.qbAccessToken,
        false, // no token secret for oAuth 2.0
        company.realmId,
        QB_ENVIRONMENT === 'production' ? false : true, // use the sandbox?
        false, // enable debugging?
        14, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        company.qbRefreshToken
    );

    qbo.findCustomers([{ field: 'fetchAll', value: true }],
        function (qbError: any, customers: any) {

            let errorMessage: string;
            if (qbError != null && Object.keys(qbError).length != 0) {

                if (qbError.hasOwnProperty('fault')) {

                    if (qbError.fault.error[0].message.length != 0 && qbError.fault.error[0].message.split('; ')[2].replace('statusCode=', '') == 401) {

                        _refreshToken(req, res, company, (error: number, newErrorMessage: string, newCompany: ICompany) => {

                            if (error == 0) {
                                next(req, res, error, newErrorMessage, []);
                                return;
                            }

                            if (error == 400) {
                                next(req, res, error, newErrorMessage, []);
                                return;
                            }

                            qbo = new QuickBooks(QB_CLIENT_ID,
                                QB_CLIENT_SECRET,
                                newCompany.qbAccessToken,
                                false, // no token secret for oAuth 2.0
                                newCompany.realmId,
                                QB_ENVIRONMENT === 'production' ? false : true, // use the sandbox?
                                false, // enable debugging?
                                14, // set minorversion, or null for the latest version
                                '2.0', //oAuth version
                                newCompany.qbRefreshToken
                            );

                            qbo.findCustomers([{ field: 'fetchAll', value: true }],
                                function (qbErrorNew: any, customers2: any) {
                                    if (qbErrorNew != null && Object.keys(qbErrorNew).length != 0) {

                                        if (qbErrorNew.hasOwnProperty('fault')) {
                                            if (qbErrorNew.fault.error[0].detail.length != 0) {
                                                errorMessage = qbErrorNew.fault.error[0].message;

                                            } else {
                                                errorMessage = qbErrorNew.fault.error[0].detail;
                                            }

                                            next(req, res, 0, errorMessage, []);
                                            return;

                                        } else if (qbErrorNew.hasOwnProperty('Fault')) {
                                            errorMessage = qbErrorNew.Fault.Error[0].Message;
                                            next(req, res, 0, errorMessage, []);
                                            return;
                                        }

                                    } else {
                                        next(req, res, 1, '', customers2);
                                        return;
                                    }
                                }
                            );
                        });

                    } else if (qbError.fault.error[0].detail.length != 0) {
                        errorMessage = qbError.fault.error[0].message;
                        next(req, res, 0, errorMessage, []);
                        return;

                    } else {
                        errorMessage = qbError.fault.error[0].detail;
                        next(req, res, 0, errorMessage, []);
                        return;
                    }

                } else if (qbError.hasOwnProperty('Fault')) {
                    errorMessage = qbError.Fault.Error[0].Message;
                    next(req, res, 0, errorMessage, []);
                    return;

                }

            } else {
                next(req, res, 1, '', customers);
                return;
            }
        }
    );
};

/**
* Generic function to create QuickBooks Customer,
* this used by Customer Controller when creating new customer,
* and this contoller when syncing customer
*/
export const _createQBCustomer = async (req: Request, res: Response, company: ICompany, customer: ICustomer, next: (error: number, errorMessage: string, qbCustomer: IQBCustomer) => void) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                // qbAuthorized: false,
                // qbAccessToken: undefined,
                // qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized, null);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.findCustomers([
            { field: 'DisplayName', value: customer?.profile?.displayName },
            { field: 'Job', value: false }
        ], async (err: any, data: any) => {
            if (err) {
                console.log('== _createQBCustomer > qbo.findCustomers > ERROR ==');
                console.log('== err.Fault:', err.Fault);
                console.log('== customerId:', customer._id);
                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Message
                    || err.fault?.error[0]?.detail
                    || err.fault?.error[0]?.message
                    || Messages.GenericError,
                    null
                );
            }

            if (data?.QueryResponse?.Customer?.length) {
                const qbCustomer = data?.QueryResponse?.Customer[0];

                customer.quickbookId = qbCustomer.Id;
                await customer.save();

                return next(null, null, qbCustomer);
            } else {
                // Construct QB Customer Entry
                const qbCustomerEntry: IQBCustomer = {
                    PrimaryEmailAddr: {
                        Address: customer?.info?.email
                    },
                    DisplayName: customer?.profile?.displayName,
                    GivenName: customer?.profile?.firstName,
                    FamilyName: customer?.profile?.lastName,
                    CompanyName: customer?.profile?.displayName,
                    Job: false,
                    PrimaryPhone: {
                        FreeFormNumber: customer?.contact?.phone
                    },
                    BillAddr: {
                        Line1: customer?.address?.street,
                        Line2: customer?.address?.unit,
                        City: customer?.address?.city,
                        CountrySubDivisionCode: customer?.address?.state,
                        PostalCode: customer?.address?.zipCode,
                        Long: customer?.location?.coordinates[0]?.toString(),
                        Lat: customer?.location?.coordinates[1]?.toString(),
                    },
                    ShipAddr: {
                        Line1: customer?.address?.street,
                        Line2: customer?.address?.unit,
                        City: customer?.address?.city,
                        CountrySubDivisionCode: customer?.address?.state,
                        PostalCode: customer?.address?.zipCode,
                        Long: customer?.location?.coordinates[0]?.toString(),
                        Lat: customer?.location?.coordinates[1]?.toString(),
                    }
                };

                // Create QB Customer
                qbo.createCustomer(qbCustomerEntry, async (err: any, qbCustomer: IQBCustomer) => {
                    if (err) {
                        console.log('== _createQBCustomer > qbo.createCustomer > ERROR ==');
                        console.log('== err.Fault:', err.Fault);
                        console.log('== err.Fault?.Error[0]?.Message:', err.Fault?.Error[0]?.Message);
                        console.log('== err.fault:', err.fault);
                        console.log('== err.fault?.error[0]?.detail:', err.fault?.error[0]?.detail);
                        console.log('== err.fault?.error[0]?.message:', err.fault?.error[0]?.message);
                        console.log('== customerId:', customer._id);
                        return next(
                            Status.Error,
                            err.Fault?.Error[0]?.Message
                            || err.fault?.error[0]?.detail
                            || err.fault?.error[0]?.message
                            || Messages.GenericError,
                            null
                        );
                    }

                    if (qbCustomer) {
                        customer.quickbookId = qbCustomer.Id;
                        await customer.save();
                    }

                    return next(null, null, qbCustomer);
                });
            }
        });

    });

};

/**
 * Generic function to check QuickBooks Customer,
 * if reference QB ID mismatch, this will fix it,
 * if customer or job locations not found, create it,
 * this used by Invoice controller before creating QB Invoice,
 * and Payment controller before creating QB Payment
 */
export const _checkQBCustomerJobLocation = async (req: Request, res: Response, company: ICompany, customerId: string, next: (error: number, errorMessage: string, qbCustomer: IQBCustomer) => void) => {

    // Initiate node-quickbooks object with the refreshed company token
    const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

    // Find the company customer
    const companyCustomer = await CompanyCustomer.findOne({ company: company._id,customer: customerId });

    if (!companyCustomer) {
        return next(Status.Error, 'Customer not found', null);
    }

    // Find the customer
    const customer = await Customer.findById(customerId).populate({ path: 'jobLocations' });

    /**
     * Always find the QBooks Customer by DisplayName,
     * because it is the only one unique for QBooks Customer
     */
    qbo.findCustomers([
        { field: 'DisplayName', value: customer?.profile?.displayName },
        { field: 'Job', value: false }
    ], async (err: any, data: any) => {
        if (err) {
            console.log('== _createQBCustomerJobLocation > qbo.findCustomers > ERROR ==');
            console.log('== err.Fault:', err.Fault);
            console.log('== err.Fault?.Error[0]?.Message:', err.Fault?.Error[0]?.Message);
            console.log('== customerId:', customer._id);
            return next(
                Status.Error,
                err.Fault?.Error[0]?.Message
                || err.fault?.error[0]?.detail
                || err.fault?.error[0]?.message
                || Messages.GenericError,
                null
            );
        }

        if (data?.QueryResponse?.Customer?.length) {
            // QBooks CUSTOMER FOUND, resynced the QB ID
            const qbCustomer = data.QueryResponse.Customer[0];

            customer.quickbookId = qbCustomer.Id;
            await customer.save();

            /**
             * Iterate all job locations of the customer,
             * check, then create on QB it not existed
             */
            await _processJobLocations(req, res, qbo, company, customer);

            return next(null, null, qbCustomer);
        } else {
            // QBooks CUSTOMER NOT FOUND, CREATE NEW ONE
            // Construct QB Customer Entry
            const qbCustomerEntry = await _getQbCustomerEntry(customer);

            // Create QB Customer
            qbo.createCustomer(qbCustomerEntry, async (err: any, qbCustomer: IQBCustomer) => {
                if (err) {
                    console.log('err',err);
                    console.log('== _createQBCustomerJobLocation > qbo.createCustomer > ERROR ==');
                    console.log('== err.Fault:', err.Fault);
                    console.log('== err.Fault?.Error[0]?.Message:', err.Fault?.Error[0]?.Message);
                    console.log('== err.fault:', err.fault);
                    console.log('== err.fault?.error[0]?.detail:', err.fault?.error[0]?.detail);
                    console.log('== err.fault?.error[0]?.message:', err.fault?.error[0]?.message);
                    console.log('== customerId:', customer._id);
                    return next(
                        Status.Error,
                        err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError,
                        null
                    );
                }

                if (qbCustomer) {
                    customer.quickbookId = qbCustomer.Id;
                    await customer.save();

                    /**
                     * Iterate all job locations of the customer,
                     * check, then create on QB it not existed
                     */
                    await _processJobLocations(req, res, qbo, company, customer);

                }

                return next(null, null, qbCustomer);
            });
        }
    });

};

/**
* Generic function to update QuickBooks Customer,
* this used by Customer Controller when updating customer,
* and when merge duplicated customers
*/
export const _updateQBCustomer = async (req: Request, res: Response, company: ICompany, customer: ICustomer, next: (error: number, errorMessage: string, qbCustomer: IQBCustomer) => void) => {

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

        qbo.getCustomer(customer.quickbookId, async (err: any, qbCustomer: IQBCustomer) => {
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

            qbCustomer.Active = customer.isActive;
            qbCustomer.DisplayName = customer?.profile?.displayName;
            qbCustomer.GivenName = customer?.profile?.firstName;
            qbCustomer.FamilyName = customer?.profile?.lastName;
            qbCustomer.CompanyName = customer?.profile?.displayName;
            qbCustomer.PrimaryEmailAddr = qbCustomer.PrimaryEmailAddr ?? { Address: '' };
            qbCustomer.PrimaryEmailAddr.Address = customer?.info?.email;
            qbCustomer.PrimaryPhone = qbCustomer.PrimaryPhone ?? {};
            qbCustomer.PrimaryPhone.FreeFormNumber = customer?.contact?.phone;

            qbCustomer.BillAddr = qbCustomer.BillAddr ?? {};
            qbCustomer.BillAddr.Line1 = customer?.address?.street,
            qbCustomer.BillAddr.Line2 = customer?.address?.unit,
            qbCustomer.BillAddr.City = customer?.address?.city,
            qbCustomer.BillAddr.CountrySubDivisionCode = customer?.address?.state,
            qbCustomer.BillAddr.PostalCode = customer?.address?.zipCode,
            qbCustomer.BillAddr.Long = customer?.location?.coordinates[0]?.toString(),
            qbCustomer.BillAddr.Lat = customer?.location?.coordinates[1]?.toString(),

            qbCustomer.ShipAddr = qbCustomer.ShipAddr ?? {};
            qbCustomer.ShipAddr.Line1 = customer?.address?.street;
            qbCustomer.ShipAddr.Line2 = customer?.address?.unit,
            qbCustomer.ShipAddr.City = customer?.address?.city;
            qbCustomer.ShipAddr.CountrySubDivisionCode = customer?.address?.state;
            qbCustomer.ShipAddr.PostalCode = customer?.address?.zipCode;
            qbCustomer.ShipAddr.Long = customer?.location?.coordinates[0]?.toString();
            qbCustomer.ShipAddr.Lat = customer?.location?.coordinates[1]?.toString();

            qbo.updateCustomer(qbCustomer, async (err: any, qbCustomer: IQBCustomer) => {
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

                return next(null, null, qbCustomer);
            });
        });
    });

};

/**
 * Generic function to inactivate/disable Customers in QB,
 * this used by Customer Controller after merging duplicated customers
 */
export const _inactivateQBCustomers = async (req: Request, res: Response, company: ICompany, customers: ICustomer[], next: (error: number, errorMessage: string) => void) => {

    // Get the QB Invoice object based on invoice quickbookId
    const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

    // Iterate all unused customers and deactive them on QB
    for (const customer of customers) {
        if (customer?.quickbookId) {
            qbo.getCustomer(customer.quickbookId, async (err: any, qbCustomer: IQBCustomer) => {
                if (qbCustomer) {
                    qbCustomer.Active = false;

                    qbo.updateCustomer(qbCustomer, async (err: any, updatedQbCustomer: IQBCustomer) => {
                        if (err || !updatedQbCustomer) {
                            return next(
                                Status.Error,
                                err.Fault?.Error[0]?.Detail
                                || err.Fault?.Error[0]?.Message
                                || err.fault?.error[0]?.detail
                                || err.fault?.error[0]?.message
                                || Messages.GenericError
                            );
                        }
                    });
                }
            });
        }
    }

    return next(null, null);

};

/**
 * Generic function to process Customer's Job Locations,
 * will check if it is existed on QuickBooks or not
 */
const _processJobLocations = async (req: Request, res: Response, qbo: any, company: ICompany, customer: ICustomer) => {

    /**
     * Iterate all job locations of the customer,
     * check, then create on QB it not existed
     */
    for (const custJobLoc of customer?.jobLocations) {
        const jobLocation = <IJobLocation>custJobLoc;

        /**
         * Always find QBooks Sub Customer by DisplayName and Job: true,
         * since DisplayName is the only one unique for QBooks Customer.
         * The uniqueness of Sub Customer's DisplayName only applied,
         * under its Parent Customer, another Customer could use the same name.
         */
        qbo.findCustomers([
            { DisplayName: jobLocation.name },
            { field: 'Job', value: true }
        ], async (err: any, data: any) => {
            if (data?.QueryResponse?.Customer?.length) {
                /**
                 * QBooks SUB CUSTOMER(S) FOUND,
                 * but could be multiple across multiple Customers,
                 * since QBooks is so stupid that we cannot query by ParentRef.
                 */
                const qbCustomerJobs = data.QueryResponse.Customer;

                // That's why we need to filter find the right Sub Customer ourself here
                const qbCustomerJob = qbCustomerJobs.find((qbCustJob: IQBCustomer) => qbCustJob?.ParentRef?.value === customer?.quickbookId);

                if (!qbCustomerJob) {
                    // SUB CUSTOMER NOT FOUND, create new one
                    await _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, async (err, errMsg, qbCustomerJob) => {
                        if (qbCustomerJob) {
                            // QB Customer Job created, update DB Job Location quickbookId
                            await JobLocation.findByIdAndUpdate(jobLocation, { quickbookId: qbCustomerJob.Id }).exec();
                        }
                    });

                    return;
                } else {
                    // SUB CUSTOMER FOUND, update DB Job Location quickbookId directly
                    await JobLocation.findByIdAndUpdate(jobLocation, { quickbookId: qbCustomerJob.Id }).exec();

                    return;
                }
            } else {
                // SUB CUSTOMER NOT FOUND, create new one
                await _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, async (err, errMsg, qbCustomerJob) => {
                    if (qbCustomerJob) {
                        // QB Customer Job created, update DB Job Location quickbookId
                        await JobLocation.findByIdAndUpdate(jobLocation, { quickbookId: qbCustomerJob.Id }).exec();
                    }
                });

                return;
            }
        });

    }

};

/**
* Generic function to create QuickBooks Customer Job,
* this used by Job Location Controller when creating new job location,
* and this contoller when syncing customer job
*/
export const _createQBCustomerJob = async (req: Request, res: Response, company: ICompany, jobLocation: IJobLocation, parentQBCustomerId: string, next: (error: number, errorMessage: string, qbCustomerJob: IQBCustomer) => void) => {

    // Populate the job location to have customer object
    await jobLocation
        .populate({ path: 'customerId' })
        .populate({ path: 'contacts ' })
        .execPopulate();

    // Customer of the job location
    const customerCompany = <ICompany>jobLocation.builderId;
    const contact = <IContact>jobLocation.contacts[0];

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return next(Status.QBUnauthorized, errMsg, null);
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

        // Construct QB Customer Entry
        const qbCustomerEntry: IQBCustomer = {
            PrimaryEmailAddr: {
                Address: customerCompany?.info?.companyEmail
            },
            DisplayName: jobLocation.name,
            GivenName: contact?.name?.split(/[ ,]+/)[0] || customerCompany?.info.companyName,
            FamilyName: contact?.name?.split(/[ ,]+/)[1] || customerCompany?.info.companyName,
            CompanyName: customerCompany?.info.companyName,
            Job: true,
            Active: jobLocation.isActive ?? true,
            ParentRef: { value: parentQBCustomerId },
            BillWithParent: true,
            PrimaryPhone: {
                FreeFormNumber: customerCompany?.contact?.phone
            },
            BillAddr: {
                Line1: customerCompany?.address?.street,
                City: customerCompany?.address?.city,
                CountrySubDivisionCode: customerCompany?.address?.state,
                PostalCode: customerCompany?.address?.zipCode,
            },
            ShipAddr: {
                Line1: jobLocation?.address?.street,
                City: jobLocation?.address?.city,
                CountrySubDivisionCode: jobLocation?.address?.state,
                PostalCode: jobLocation?.address?.zipcode,
                Long: jobLocation?.location?.coordinates[0]?.toString(),
                Lat: jobLocation?.location?.coordinates[1]?.toString(),
            }
        };

        // Create QB Customer
        qbo.createCustomer(qbCustomerEntry, async (err: any, qbCustomer: IQBCustomer) => {
            if (err) {
                if (err) {
                    console.log('== _createQBCustomerJob > qbo.createCustomer > ERROR ==');
                    console.log('== err.Fault:', err.Fault);
                    console.log('== err.Fault?.Error[0]?.Message:', err.Fault?.Error[0]?.Message);
                    console.log('== jobLocationId:', jobLocation._id, '\n\n');
                }

                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Message
                    || err.fault?.error[0]?.detail
                    || err.fault?.error[0]?.message
                    || Messages.GenericError,
                    null
                );
            }

            return next(null, null, qbCustomer);
        });
    });

};

/**
 * Generic function to update QuickBooks Customer Job,
 * this used by Job Location Controller when updating job location
 */
export const _updateQBCustomerJob = async (req: Request, res: Response, company: ICompany, jobLocation: IJobLocation, parentQBCustomerId: string, next: (error: number, errorMessage: string, qbCustomerJob: IQBCustomer) => void) => {

    // Populate the job location to have customer object
    await jobLocation
        .populate({ path: 'customerId' })
        .populate({ path: 'contacts ' })
        .execPopulate();

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                // qbAuthorized: false,
                // qbAccessToken: undefined,
                // qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized, null);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.getCustomer(jobLocation.quickbookId, async (err: any, qbCustomerJob: IQBCustomer) => {

            if (!qbCustomerJob) {
                return next(null, null, null);
            }

            qbCustomerJob.DisplayName = jobLocation.name;
            qbCustomerJob.BillWithParent = true;
            qbCustomerJob.Active = jobLocation.isActive;
            qbCustomerJob.ShipAddr = qbCustomerJob.ShipAddr ?? {};
            qbCustomerJob.ShipAddr.Line1 = jobLocation?.address?.street;
            qbCustomerJob.ShipAddr.City = jobLocation?.address?.city;
            qbCustomerJob.ShipAddr.CountrySubDivisionCode = jobLocation?.address?.state;
            qbCustomerJob.ShipAddr.PostalCode = jobLocation?.address?.zipcode;
            qbCustomerJob.ShipAddr.Long = jobLocation?.location?.coordinates[0]?.toString();
            qbCustomerJob.ShipAddr.Lat = jobLocation?.location?.coordinates[1]?.toString();

            qbo.updateCustomer(qbCustomerJob, async (err: any, qbCustomerJob: IQBCustomer) => {
                if (err) {
                    console.log('== _updateQBCustomerJob > qbo.updateCustomer > ERROR ==');
                    console.log('== err.Fault:', err.Fault);
                    console.log('== err.Fault?.Error[0]?.Message:', err.Fault?.Error[0]?.Message);
                    console.log('== err.fault:', err.fault);
                    console.log('== err.fault?.error[0]?.detail:', err.fault?.error[0]?.detail);
                    console.log('== err.fault?.error[0]?.message:', err.fault?.error[0]?.message);
                    console.log('== jobLocationId:', jobLocation._id);

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

                return next(null, null, qbCustomerJob);
            });
        });
    });

};

/**
* To find if exist and/or create customer in QuickBooks,
* and associate it with a certain customer in BClerk
*/
// TODO: Use _checkQBCustomerJobLocation, since it is same but refactored
export const createQBCustomer = async (req: Request, res: Response) => {

    const params = req.body;
    const companyId = req.companyId;
    const company = req.company;

    // Initiate node-quickbooks object with the refreshed company token
    const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

    // Find the company customer
    const companyCustomer = await CompanyCustomer.findOne({ company: companyId, customer: params.customerId });

    if (!companyCustomer) {
        return res.json({ status: Status.Error, message: 'Customer not found' });
    }

    //  Find the customer
    const customer = await Customer.findById(params.customerId);

    /**
     * Always find the QBooks Customer by DisplayName,
     * because it is the only one unique for QBooks Customer
     */
    qbo.findCustomers([
        { field: 'DisplayName', value: customer?.profile?.displayName },
        { field: 'Job', value: false }
    ], async (err: any, data: any) => {
        if (err) {
            console.log('== createQBCustomer > qbo.findCustomers > ERROR ==');
            console.log('== err.Fault:', err.Fault);
            console.log('== err.Fault?.Error[0]?.Message:', err.Fault?.Error[0]?.Message);
            console.log('== customerId:', customer._id);
        }

        if (data?.QueryResponse?.Customer?.length) {
            // QBooks CUSTOMER FOUND, resynced the QB ID
            const qbCustomer = data.QueryResponse.Customer[0];

            customer.quickbookId = qbCustomer.Id;
            await customer.save();

            // Populate job locations of customer
            await customer.populate({ path: 'jobLocations' }).execPopulate();

            /**
             * Iterate all job locations of the customer,
             * check, then create on QB it not existed
             */
            for (const custJobLoc of customer?.jobLocations) {
                const jobLocation = <IJobLocation>custJobLoc;

                /**
                 * Always find QBooks Sub Customer by DisplayName and Job: true,
                 * since DisplayName is the only one unique for QBooks Customer.
                 * The uniqueness of Sub Customer's DisplayName only applied,
                 * under its Parent Customer, another Customer could use the same name.
                 */
                qbo.findCustomers([
                    { DisplayName: jobLocation.name },
                    { field: 'Job', value: true }
                ], async (err: any, data: any) => {

                    if (data?.QueryResponse?.Customer?.length) {
                        /**
                         * QBooks SUB CUSTOMER(S) FOUND,
                         * but could be multiple across multiple Customers,
                         * since QBooks is so stupid that we cannot query by ParentRef.
                         */
                        const qbCustomerJobs = data.QueryResponse.Customer;

                        // That's why we need to filter find the right Sub Customer ourself here
                        const qbCustomerJob = qbCustomerJobs.find((qbCustJob: IQBCustomer) => qbCustJob?.ParentRef?.value === customer?.quickbookId);

                        if (!qbCustomerJob) {
                            // SUB CUSTOMER NOT FOUND, create new one
                            _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, async (err, errMsg, qbCustomerJob) => {
                                if (qbCustomerJob) {
                                    // QB Customer Job created, update DB Job Location quickbookId
                                    jobLocation.quickbookId = qbCustomerJob.Id;
                                    await jobLocation.save();
                                }
                            });
                        } else {
                            // SUB CUSTOMER FOUND, update DB Job Location quickbookId directly
                            jobLocation.quickbookId = qbCustomerJob.Id;
                            await jobLocation.save();
                        }
                    } else {
                        // SUB CUSTOMER NOT FOUND, create new one
                        _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, async (err, errMsg, qbCustomerJob) => {
                            if (qbCustomerJob) {
                                // QB Customer Job created, update DB Job Location quickbookId
                                jobLocation.quickbookId = qbCustomerJob.Id;
                                await jobLocation.save();
                            }
                        });
                    }
                });
            }

            return res.json({ status: Status.Error, qbCustomer });
        } else {
            // QBooks CUSTOMER NOT FOUND, CREATE NEW ONE
            // Construct QB Customer Entry
            const qbCustomerEntry: IQBCustomer = {
                PrimaryEmailAddr: {
                    Address: customer?.info?.email
                },
                DisplayName: customer?.profile?.displayName,
                GivenName: customer?.profile?.firstName,
                FamilyName: customer?.profile?.lastName,
                CompanyName: customer?.profile?.displayName,
                Job: false,
                PrimaryPhone: {
                    FreeFormNumber: customer?.contact?.phone
                },
                BillAddr: {
                    Line1: customer?.address?.street,
                    Line2: customer?.address?.unit,
                    City: customer?.address?.city,
                    CountrySubDivisionCode: customer?.address?.state,
                    PostalCode: customer?.address?.zipCode,
                    Long: customer?.location?.coordinates[0]?.toString(),
                    Lat: customer?.location?.coordinates[1]?.toString(),
                },
                ShipAddr: {
                    Line1: customer?.address?.street,
                    Line2: customer?.address?.unit,
                    City: customer?.address?.city,
                    CountrySubDivisionCode: customer?.address?.state,
                    PostalCode: customer?.address?.zipCode,
                    Long: customer?.location?.coordinates[0]?.toString(),
                    Lat: customer?.location?.coordinates[1]?.toString(),
                }
            };

            // Create QB Customer
            qbo.createCustomer(qbCustomerEntry, async (err: any, qbCustomer: IQBCustomer) => {
                if (err) {
                    console.log('== createQBCustomer > qbo.createCustomer > ERROR ==');
                    console.log('== err.Fault:', err.Fault);
                    console.log('== err.Fault?.Error[0]?.Message:', err.Fault?.Error[0]?.Message);
                    console.log('== customerId:', customer._id);
                }

                if (qbCustomer) {
                    customer.quickbookId = qbCustomer.Id;
                    await customer.save();

                    // Populate job locations of customer
                    await customer.populate({ path: 'jobLocations' }).execPopulate();

                    /**
                     * Iterate all job locations of the customer,
                     * check, then create on QB it not existed
                     */
                    for (const custJobLoc of customer?.jobLocations) {
                        const jobLocation = <IJobLocation>custJobLoc;

                        /**
                         * Always find QBooks Sub Customer by DisplayName and Job: true,
                         * since DisplayName is the only one unique for QBooks Customer.
                         * The uniqueness of Sub Customer's DisplayName only applied,
                         * under its Parent Customer, another Customer could use the same name.
                         */
                        qbo.findCustomers([
                            { DisplayName: jobLocation.name },
                            { field: 'Job', value: true }
                        ], async (err: any, data: any) => {
                            if (data?.QueryResponse?.Customer?.length) {
                                /**
                                 * QBooks SUB CUSTOMER(S) FOUND,
                                 * but could be multiple across multiple Customers,
                                 * since QBooks is so stupid that we cannot query by ParentRef.
                                 */
                                const qbCustomerJobs = data?.QueryResponse?.Customer;

                                // That's why we need to filter find the right Sub Customer ourself here
                                const qbCustomerJob = qbCustomerJobs.find((qbCustJob: IQBCustomer) => qbCustJob?.ParentRef?.value === customer?.quickbookId);

                                if (!qbCustomerJob) {
                                    // SUB CUSTOMER NOT FOUND, create new one
                                    _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, async (err, errMsg, qbCustomerJob) => {
                                        if (qbCustomerJob) {
                                            // QB Customer Job created, update DB Job Location quickbookId
                                            jobLocation.quickbookId = qbCustomerJob.Id;
                                            await jobLocation.save();
                                        }
                                    });
                                } else {
                                    // SUB CUSTOMER FOUND, update DB Job Location quickbookId directly
                                    jobLocation.quickbookId = qbCustomerJob.Id;
                                    await jobLocation.save();
                                }
                            } else {
                                // SUB CUSTOMER NOT FOUND, create new one
                                _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, (err, errMsg, qbCustomerJob) => {
                                    if (qbCustomerJob) {
                                        // QB Customer Job created, update DB Job Location quickbookId
                                        jobLocation.quickbookId = qbCustomerJob.Id;
                                        jobLocation.save();
                                    }
                                });
                            }
                        });
                    }
                }

                return res.json({ status: Status.Error, qbCustomer });
            });
        }
    });

};

export const syncQBCustomers = async (req: Request, res: Response) => {

    return res.json({ status: Status.Success, message: 'Hi, this feature is currently on maintenance. But don\'t worry, your QuickBooks automatic sync feature are still working. If you have something urgent, you can contact the dev team. We\'ll be back up soon.' });

    try {
        const user = <IUser>req.user;
        const createdCustomers: { _id: string, name: string }[] = [];
        const updatedCustomers: { _id: string, name: string }[] = [];
        const custsToCreate: ICustomer[] = [];
        const compCustsToCreate: ICompanyCustomer[] = [];
        const jobLocationToCreate: IJobLocation[] = [];

        // Always refresh the token first because token valid only for 60 minutes
        _refreshToken(req, res, req.company, async (err, errMsg, company) => {
            if (err === 0)
                return res.json({ status: Status.Error, message: errMsg });

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

            /**
             * QB authentication and token refresh successfully,
             * return the HTTP request of user directly here,
             * to avoid time out issue,
             * later we can upgrade the logic to use socket.io,
             * to tell FE the progress or notification
             */
            res.json({ status: Status.Success, message: 'Customer syncing in the background, try to refresh the page later' });

            // Find customers from DB and populate its jobLocations
            // Find the company customer
            let companyCustomers = await CompanyCustomer.find({ company: company._id });
            let customerIds = companyCustomers.map(cc => cc.customer);
            let customers = await Customer.find({ _id: { $in: customerIds } }).populate({ path: 'jobLocations '});

            qbo.findCustomers({ fetchAll: true }, async (err: any, data: any) => {
                if (err) {
                    return res.json({
                        status: Status.Error,
                        message: err.Fault?.Error[0]?.Message
                            || err.fault?.error[0]?.detail
                            || err.fault?.error[0]?.message
                            || Messages.GenericError
                    });
                }

                const qbCustomers: IQBCustomer[] = data?.QueryResponse?.Customer;

                // Split and filter QuickBooks' only customers for this phase
                const qbCustomersOnly = qbCustomers.filter(qbCustomer => !qbCustomer.Job);

                // Iterate all customers from DB
                for (const customer of customers) {
                    const qbCustomer = qbCustomersOnly?.find((qbCustomer: IQBCustomer) => qbCustomer?.DisplayName?.toLowerCase() === customer?.profile?.displayName?.toLowerCase());

                    // Customer not exist on QB, create it
                    if (!qbCustomer) {
                        setTimeout(async () => {
                            await _createQBCustomer(req, res, company, customer, async (err, errMsg, qbCustomer) => {
                                if (qbCustomer) {
                                    // QB Customer created, update DB Customer quickbookId
                                    customer.quickbookId = qbCustomer.Id;
                                    await customer.save();

                                    await _processJobLocations(req, res, qbo, company, customer);
                                }
                            });
                        }, 1000);
                    } else {
                        // QB Customer exist, update DB Customer quickbookId directly
                        customer.quickbookId = qbCustomer.Id;
                        await customer.save();

                        await _processJobLocations(req, res, qbo, company, customer);
                    }
                }

                // Iterate all QuickBooks customers only
                for (const qbCustomer of qbCustomersOnly) {
                    // Check if there any customer on QB that not on DB yet
                    const customer = customers.find(customer => {
                        if (customer?.profile?.displayName?.toLowerCase() === qbCustomer?.DisplayName?.toLowerCase()) {
                            return customer;
                        }
                    });

                    if (customer) {
                        // Customer found, check and update quickbookId
                        customer.quickbookId = qbCustomer.Id;
                        await customer.save();
                    } else {
                        // Customer not found, create it
                        const custEntry = new Customer({
                            info: { email: qbCustomer.PrimaryEmailAddr?.Address },
                            profile: {
                                firstName: qbCustomer.GivenName,
                                lastName: qbCustomer.FamilyName,
                                displayName: qbCustomer.DisplayName,
                                imageUrl: ''
                            },
                            address: {
                                street: qbCustomer.BillAddr?.Line1,
                                unit: qbCustomer.BillAddr?.Line2,
                                city: qbCustomer.BillAddr?.City,
                                state: qbCustomer.BillAddr?.CountrySubDivisionCode,
                                zipCode: qbCustomer.BillAddr?.PostalCode
                            },
                            isActive: qbCustomer.Active,
                            contact: { phone: qbCustomer.PrimaryPhone?.FreeFormNumber, },
                            contacts: [
                                await new Contact({
                                    name: [qbCustomer.GivenName, qbCustomer.FamilyName].join(' ').trim() || qbCustomer.DisplayName,
                                    phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
                                    email: qbCustomer.PrimaryEmailAddr?.Address
                                }).save()
                            ],
                            permissions: { role: Role.CUSTOMER, extra: [] },
                            quickbookId: qbCustomer.Id,
                        });

                        /**
                         * Kris' remark (Sept 23rd, 2021):
                         * Disable this one for know,
                         * since we can't save lat long on QB Online
                         */
                        // if (qbCustomer.BillAddr?.Long && qbCustomer.BillAddr?.Lat) {
                        //     custEntry.location = {
                        //         coordinates: [Number(qbCustomer.BillAddr?.Long), Number(qbCustomer.BillAddr?.Lat)]
                        //     }
                        // }
                        const customerAdmin = await new CustomerAdmin({
                            auth: {
                                email: qbCustomer.PrimaryEmailAddr?.Address
                            },
                            info: { email: qbCustomer.PrimaryEmailAddr?.Address },
                            location: customer?.location,
                            address: {
                                street: qbCustomer.BillAddr?.Line1,
                                unit: qbCustomer.BillAddr?.Line2,
                                city: qbCustomer.BillAddr?.City,
                                state: qbCustomer.BillAddr?.CountrySubDivisionCode,
                                zipCode: qbCustomer.BillAddr?.PostalCode
                            },
                            customer: custEntry._id
                        }).save();

                        customerAdmin.customer = custEntry._id;
                        custEntry.admin = customerAdmin._id;

                        custsToCreate.push(custEntry);
                        // Save the new customer from QB
                        await custEntry.save();
                    }
                }

                if (custsToCreate.length > 0) {
                    // Iterate customer to be create to create Company Customer entries
                    for (const customer of custsToCreate) {
                        compCustsToCreate.push(
                            new CompanyCustomer({
                                company: company._id,
                                customer: customer._id,
                                createdAt: Date.now()
                            })
                        );
                    }

                    // Create all company customers to DB at once
                    await CompanyCustomer.create(compCustsToCreate);
                }

                // Split and filter QuickBooks' only jobs level 1 for this phase
                const qbCustomerJobs = qbCustomers.filter(qbCustomer => qbCustomer.Job && qbCustomer.Level === 1);

                // Update customers data from DB and populate its jobLocations
                companyCustomers = await CompanyCustomer.find({ company: company._id });
                customerIds = companyCustomers.map(cc => cc.customer);
                customers = await Customer.find({ _id: { $in: customerIds } }).populate({ path: 'jobLocations '});

                // Iterate all QuickBooks jobs only
                for (const qbCustJob of qbCustomerJobs) {
                    // Find BClerk customer based on customer quickbookId as the parent customer of QBooks job
                    let parentCustomer = customers.find(customer => customer?.quickbookId === qbCustJob.ParentRef?.value);

                    /**
                     * No parent customer found, find on customer entries to be create,
                     * as probably it is a new customer as well from QB
                     */
                    if (!parentCustomer) {
                        parentCustomer = custsToCreate.find(customer => customer?.quickbookId === qbCustJob.ParentRef?.value);
                    }

                    if (!parentCustomer) {
                        /**
                         * Parent Customer still not found,
                         * TODO: need to collect the information and send through notifacation or email
                         */
                        continue;
                    }

                    const jobLocation = <IJobLocation>parentCustomer?.jobLocations?.find((jl: IJobLocation) => {
                        return (jl.name === qbCustJob.DisplayName);
                    });

                    if (jobLocation) {
                        await JobLocation.findByIdAndUpdate(jobLocation._id, { quickbookId: qbCustJob.Id }).exec();
                    } else {
                        // Job location not found, create a new one
                        const jobLocationEntry = new JobLocation({
                            name: qbCustJob.DisplayName,
                            isActive: qbCustJob.Active,
                            address: {
                                street: qbCustJob.ShipAddr?.Line1 ?? qbCustJob.BillAddr?.Line1,
                                city: qbCustJob.ShipAddr?.City ?? qbCustJob.BillAddr?.City,
                                state: qbCustJob.ShipAddr?.CountrySubDivisionCode ?? qbCustJob.BillAddr?.CountrySubDivisionCode,
                                zipcode: qbCustJob.ShipAddr?.PostalCode ?? qbCustJob.BillAddr?.PostalCode
                            },
                            contacts: [
                                await new Contact({
                                    name: [qbCustJob.GivenName, qbCustJob.FamilyName].join(' ').trim() || qbCustJob.DisplayName,
                                    phone: qbCustJob.PrimaryPhone?.FreeFormNumber,
                                    email: qbCustJob.PrimaryEmailAddr?.Address
                                }).save()
                            ],
                            customerId: parentCustomer._id,
                            companyId: company._id,
                            quickbookId: qbCustJob.Id
                        });

                        /**
                         * Kris' remark (Sept 23rd, 2021):
                         * Disable this one for know,
                         * since we can't save lat long on QB Online
                         */
                        // if (qbCustJob.BillAddr?.Lat && qbCustJob.BillAddr?.Long) {
                        //     jobLocationEntry.location = {
                        //         coordinates: [
                        //             Number(qbCustJob.BillAddr?.Long),
                        //             Number(qbCustJob.BillAddr?.Lat)
                        //         ]
                        //     }
                        // }

                        jobLocationToCreate.push(jobLocationEntry);
                        // Save the new Job Location from QB Customer Job Level 1
                        await jobLocationEntry.save();
                        // Save the create Job Location to the Customer's jobLocations
                        await Customer.findByIdAndUpdate(parentCustomer._id, { $push: { jobLocations: jobLocationEntry._id } }).exec();
                    }
                }

                company.qbSync.customersSynced = true;
                company.qbSync.customersSyncedAt = new Date();
                await company.save();

                /**
                 * Kris' remark (Sept 22nd, 2021):
                 * Comment this return because we want to return the response directly,
                 * after refreshing the QB token above
                 */
                // return res.json({ status: Status.Success, message: 'Customer synced successfully.', createdCustomers, updatedCustomers });
            });
        });
    } catch (error) {
        console.log('== error:', error);
        Sentry.captureException(error);
        // For testing purpose to know if Webhook received on staging and production
        // const notification = new NotificationServiceTicket({
        //     company: '60884254898eb7068283bfcd',
        //     notificationType: NotificationTypes.CONTRACT_REJECTED,
        //     message: {
        //         title: 'Error on Sync QB Customer',
        //         body: `${error}`
        //     },
        //     metadata: '60884254898eb7068283bfce'
        // });

        // await notification.save();
    }

};

/**
 * Called by quickbook controller when handle webhook from Quickbooks
 */
export const updateBCCustomer = async (req: Request, res: Response, company: ICompany, qbCustomerId: string, next: (error: number, errorMessage: string, customer: ICustomer, jobLocation: IJobLocation) => void) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        let customer: ICustomer;
        let jobLocation: IJobLocation;

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Get QB Customer by ID sent through webhook
        qbo.getCustomer(qbCustomerId, async (err: any, qbCustomer: IQBCustomer) => {
            if (err) {
                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Detail
                    || err.Fault?.Error[0]?.Message
                    || err.fault?.error[0]?.detail
                    || err.fault?.error[0]?.message
                    || Messages.GenericError,
                    null,
                    null,
                );
            }

            // Handle QB Customer for this method
            if (!qbCustomer.Job) {
                // Get BC Customer by QB Customer's quickbookId
                customer = await Customer.findOne({ quickbookId: qbCustomer.Id, 'info.email': qbCustomer.PrimaryEmailAddr?.Address });
                const currentIsActive = customer.isActive;

                if (customer) {
                    // Update Customer data based on QB Customer
                    customer.isActive = qbCustomer?.Active;
                    customer.profile.displayName = qbCustomer.DisplayName;
                    customer.profile.firstName = qbCustomer.GivenName;
                    customer.profile.lastName = qbCustomer.FamilyName;
                    customer.profile.displayName = qbCustomer.CompanyName;
                    customer.contact = customer.contact ?? { phone: '' };
                    customer.contact.phone = qbCustomer.PrimaryPhone?.FreeFormNumber;
                    customer.address = customer.address ?? {};
                    customer.address.street = qbCustomer.BillAddr?.Line1;
                    customer.address.unit = qbCustomer.BillAddr?.Line2;
                    customer.address.city = qbCustomer.BillAddr?.City;
                    customer.address.state = qbCustomer.BillAddr?.CountrySubDivisionCode;
                    customer.address.zipCode = qbCustomer.BillAddr?.PostalCode;

                    if (currentIsActive && !qbCustomer.Active) {
                        customer.inactiveAt = new Date();
                    } else if (qbCustomer.Active) {
                        customer.inactiveAt = null;
                        customer.inactiveBy = null;
                    }

                    await customer.save();
                }
            } else {
                // Get BC Job Location by QB Customer Job's quickbookId
                jobLocation = await JobLocation.findOne({ companyId: company._id, quickbookId: qbCustomer.Id });

                if (jobLocation) {
                    const currentIsActive = jobLocation.isActive;

                    // Update Job Location data based on QB Customer Job
                    jobLocation.name = qbCustomer.DisplayName;
                    jobLocation.isActive = qbCustomer.Active;
                    jobLocation.address.street = qbCustomer.ShipAddr?.Line1 ?? qbCustomer.BillAddr?.Line1;
                    jobLocation.address.city = qbCustomer.ShipAddr?.City ?? qbCustomer.BillAddr?.City;
                    jobLocation.address.state = qbCustomer.ShipAddr?.CountrySubDivisionCode ?? qbCustomer.BillAddr?.CountrySubDivisionCode;
                    jobLocation.address.zipcode = qbCustomer.ShipAddr?.PostalCode ?? qbCustomer.BillAddr?.PostalCode;

                    if (currentIsActive && !qbCustomer.Active) {
                        jobLocation.inactiveAt = new Date();
                    } else if (qbCustomer.Active) {
                        jobLocation.inactiveAt = null;
                        jobLocation.inactiveBy = null;
                    }

                    await jobLocation.save();
                }
            }

            return next(null, null, customer, jobLocation);
        });
    });

};

export const createBCCustomer = async (req: Request, res: Response, company: ICompany, qbCustomerId: string) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Get QB Customer by ID sent through webhook
        qbo.getCustomer(qbCustomerId, async (err: any, qbCustomer: IQBCustomer) => {
            if (!qbCustomer || err) {
                return;
            }

            let customer: ICustomer;
            let jobLocation: IJobLocation;

            if (!qbCustomer.Job) {
                /**
                 * CUSTOMER FROM QBOOKS IS CUSTOMER,
                 * PROCEED TO CUSTOMER, CUSTOMER ADMIN, & COMPANY CUSTOMER
                 */

                // Find existing customer
                const customers = await Customer.find({ quickbookId: qbCustomer.Id });
                if (customers?.length) {
                    const customerIds = customers.map(customer => customer._id);
                    const companyCustomer = await CompanyCustomer.findOne({ company: company._id, customer: { $in: customerIds } });
                    if (companyCustomer) {
                        return;
                    }

                    customer = await Customer.findById(companyCustomer?.customer);
                }

                // Existing Customer found, return directly
                if (customer) {
                    return;
                }

                // Exiting Customer not found, create new Customer
                const customerEntry = new Customer({
                    info: {
                        email: qbCustomer?.PrimaryEmailAddr?.Address,
                    },
                    profile: {
                        firstName: qbCustomer?.GivenName,
                        lastName: qbCustomer?.FamilyName,
                        displayName: qbCustomer?.DisplayName,
                        imageUrl: '',
                    },
                    address: {
                        street: qbCustomer?.BillAddr?.Line1,
                        city: qbCustomer?.BillAddr?.City,
                        state: qbCustomer?.BillAddr?.Country,
                        zipCode: qbCustomer?.BillAddr?.PostalCode
                    },
                    contact: {
                        phone: qbCustomer?.PrimaryPhone?.FreeFormNumber
                    },
                    permissions: {
                        role: Role.CUSTOMER,
                        extra: [],
                    },
                    balance: qbCustomer.Balance,
                    quickbookId: qbCustomer.Id
                });

                // Create the admin for the Customer
                const customerAdmin = await new CustomerAdmin({
                    auth: {
                        email: qbCustomer?.PrimaryEmailAddr?.Address
                    },
                    info: {
                        email: qbCustomer?.PrimaryEmailAddr?.Address
                    },
                    address: {
                        street: qbCustomer?.BillAddr?.Line1,
                        city: qbCustomer?.BillAddr?.City,
                        state: qbCustomer?.BillAddr?.Country,
                        zipCode: qbCustomer?.BillAddr?.PostalCode
                    },
                    permissions: {
                        role: Role.CUSTOMER,
                        extra: [],
                    },
                    contact: {
                        phone: qbCustomer?.PrimaryPhone?.FreeFormNumber
                    },
                    emailPreferences: customerEntry?.emailPreferences,
                    customer: customerEntry._id
                }).save();

                customerEntry.admin = customerAdmin._id;
                await customerEntry.save();

                // Create the 'contract' between Company & Customer
                await new CompanyCustomer({
                    company: company._id,
                    customer: customerEntry._id,
                    createdAt: Date.now()
                }).save();

            } else {
                /**
                 * CUSTOMER FROM QBOOKS IS SUB CUSTOMER / JOB,
                 * PROCEED TO SUBDIVISION / JOB LOCATION
                 */

                // Get BClerk Job Location by QBooks Customer Job's quickbookId
                jobLocation = await JobLocation.findOne({ companyId: company._id, quickbookId: qbCustomer.Id });

                // Existing Job Location found, return directly
                if (jobLocation) {
                    return;
                }

                // Find the parent Customer
                const customers = await Customer.find({ quickbookId: qbCustomer.ParentRef?.value });
                if (customers?.length) {
                    const customerIds = customers.map(customer => customer._id);
                    const companyCustomer = await CompanyCustomer.findOne({ company: company._id, customer: { $in: customerIds } });

                    customer = await Customer.findById(companyCustomer?.customer);
                }

                // Parent Customer not found, return directly
                if (!customer) {
                    return;
                }

                // Parent Customer found, create the Job Location
                jobLocation = new JobLocation({
                    name: qbCustomer.DisplayName,
                    isActive: qbCustomer.Active,
                    address: {
                        street: qbCustomer.ShipAddr?.Line1 ?? qbCustomer.BillAddr?.Line1,
                        city: qbCustomer.ShipAddr?.City ?? qbCustomer.BillAddr?.City,
                        state: qbCustomer.ShipAddr?.CountrySubDivisionCode ?? qbCustomer.BillAddr?.CountrySubDivisionCode,
                        zipcode: qbCustomer.ShipAddr?.PostalCode ?? qbCustomer.BillAddr?.PostalCode
                    },
                    contacts: [
                        await new Contact({
                            name: [qbCustomer.GivenName, qbCustomer.FamilyName].join(' ').trim() || qbCustomer.DisplayName,
                            phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
                            email: qbCustomer.PrimaryEmailAddr?.Address
                        }).save()
                    ],
                    customerId: customer._id,
                    companyId: company._id,
                    quickbookId: qbCustomer.Id
                });

                await jobLocation.save();

                // Save the created Job Location to Customer object
                customer.jobLocations.push(jobLocation._id);
                await customer.save();
            }

            if (company.qbSync?.customersSynced) {
                company.qbSync.customersSyncedAt = new Date();
                await company.save();
            }

            return;
        });
    });

};

export const getQBCustomer = async (req: Request, res: Response) => {
    return new Promise((resolve, reject) => {
        const params = req.query;
        const company = <ICompany>req.company;
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.getCustomer(params.quickbookId, async (err: any, qbCustomer: IQBCustomer) => {
            if (err) {
                reject(err);
            } else {
                resolve(qbCustomer);
            }
        });
    })
        .then((response: any) => {
            return res.json({ 'status': Status.Success, 'message': response });
        })
        .catch((error: any) => {
            Sentry.captureException(error);
            return res.json({ status: Status.Error, message: error ?? Messages.GenericError });
        });
};

export const findQBCustomers = async (req: Request, res: Response) => {
    return new Promise((resolve, reject) => {
        const params = req.query;
        const company = <ICompany>req.company;
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.findCustomers([
            { field: 'DisplayName', value: params.name },
            // { field: 'Job', value: true }
        ], async (err: any, data: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(data?.QueryResponse?.Customer);
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

export const findQBCustomersByEmail = async (req: Request, res: Response) => {
    return new Promise((resolve, reject) => {
        const params = req.query;
        const company = <ICompany>req.company;
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.findCustomers([
            { field: 'PrimaryEmailAddr', value: params.email },
        ], async (err: any, data: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(data?.QueryResponse?.Customer);
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

/**
 * Partial method to generate QBooks Customer entry
 */
const _getQbCustomerEntry = async (customer: ICustomer): Promise<IQBCustomer> => {

    const qbCustomerEntry: IQBCustomer = {
        PrimaryEmailAddr: {
            Address: customer?.info?.email
        },
        DisplayName: customer?.profile?.displayName,
        GivenName: customer?.profile?.firstName,
        FamilyName: customer?.profile?.lastName,
        CompanyName: customer?.profile?.displayName,
        Job: false,
        PrimaryPhone: {
            FreeFormNumber: customer?.contact?.phone
        },
        BillAddr: {
            Line1: customer?.address?.street,
            Line2: customer?.address?.unit,
            City: customer?.address?.city,
            CountrySubDivisionCode: customer?.address?.state,
            PostalCode: customer?.address?.zipCode,
            Long: customer?.location?.coordinates[0]?.toString(),
            Lat: customer?.location?.coordinates[1]?.toString(),
        },
        ShipAddr: {
            Line1: customer?.address?.street,
            Line2: customer?.address?.unit,
            City: customer?.address?.city,
            CountrySubDivisionCode: customer?.address?.state,
            PostalCode: customer?.address?.zipCode,
            Long: customer?.location?.coordinates[0]?.toString(),
            Lat: customer?.location?.coordinates[1]?.toString(),
        }
    };

    return qbCustomerEntry;

};
