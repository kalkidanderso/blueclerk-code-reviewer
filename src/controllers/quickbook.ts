import {Request, Response} from 'express'
import { Status, Messages, Role} from '../common/constants'
import { qbConfig } from '../common/config'

import { IContact } from '../common/contact';
import { Contact } from '../models/Contact';
import { IUser } from '../models/User';
import { ICompany, IQBCompany, Company } from '../models/Company'
import { Customer, ICustomer, IQBCustomer } from '../models/Customer'
import { JobLocation, IJobLocation } from '../models/JobLocation';
import { CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer'
import { IJobType, JobType } from '../models/JobType'
import { IItem, IQBItem, QBItemTypes, Item } from '../models/Item';
import { IServiceTicket } from '../models/ServiceTicket';
import { IJob } from '../models/Job';
import { IInvoice, IQBInvoice, IQBInvoiceLine, LineDetailTypes, Invoice } from '../models/Invoice'

var QuickBooks = require('node-quickbooks')
var OAuthClient = require("intuit-oauth");

// ===========================================
// =======[ PRIVATE & GENERIC FUNCTION ]======
// ===========================================

const _oauthClient = new OAuthClient({
    clientId: qbConfig.qb_client_id,
    clientSecret: qbConfig.qb_client_secret,
    environment: qbConfig.qb_environment,
    redirectUri: qbConfig.qb_redirect_uri
});

const _getQbo = (oauthToken: string, realmId: string, refreshToken: string) => {
    return new QuickBooks(
        qbConfig.qb_client_id,
        qbConfig.qb_client_secret,
        oauthToken,
        false, // no token secret for oAuth 2.0
        realmId,
        true, // use the sandbox?
        false, // enable debugging?
        14, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        refreshToken
    )
};

const _refreshToken = (req: Request, res: Response, company: ICompany, next: (error: number, errorMessage: string, company: ICompany) => void) => {

    var oauthClient = new OAuthClient({
        clientId: qbConfig.qb_client_id,
        clientSecret: qbConfig.qb_client_secret,
        environment: qbConfig.qb_environment,
        redirectUri: qbConfig.qb_redirect_uri,
    });

    oauthClient
    .refreshUsingToken(company.qbRefreshToken)
    .then(function (authResponse: any) {
        const refresh_token = authResponse.token.refresh_token
        const access_token = authResponse.token.access_token

        var expiry = new Date();
        expiry.setDate(expiry.getDate() + 99)

        company.updateOne({
            qbAccessToken: access_token,
            qbRefreshToken: refresh_token,
            qbAuthorized: true,
            qbRefeshTokenExpiry: expiry
        }, (err: any, raw: any)=>{
            if(err){
                return next(0, Messages.GenericError, null);
            }

            Company.findById(company._id, (err: any, newCompany: ICompany) => {
                if(err){
                    return next(0, Messages.GenericError, null);
                }

                return next(1, '', newCompany);
            })
        })
    })
    .catch(function (err: any) {
        return next(err.authResponse?.response?.status || Status.Error, 'Unable to refersh the token', null);
    });
}

const get = function(obj: any, key: any) {
    return key.split(".").reduce(function(o: any, x: any) {
        return (typeof o == "undefined" || o === null) ? '' : o[x];
    }, obj);
}

export const getQBUri = (req: Request, res: Response) => {

    const params = req.body

    var oauthClient = new OAuthClient({
        clientId: qbConfig.qb_client_id,
        clientSecret: qbConfig.qb_client_secret,
        environment: qbConfig.qb_environment,
        redirectUri: params.redirectUri || qbConfig.qb_redirect_uri,
    });

    var authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting],
        state: req.companyId,
    });

    Company.findById(req.companyId, (err: any, company: ICompany) => {
        if(err){
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        if(company == undefined || company ==null){
            return res.json({'status': Status.Error, 'message': "Invalid company id"})
        }

        company.updateOne({
            socketId: params.sessionID
        }, (err: any, raw: any)=>{
            if(err){
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            return res.json({'status': Status.Success, 'authUri': authUri})
        })
    })
}

export const getCallBackToken = (req: Request, res: Response, sio: any) => {

    const query = req.query;

    var oauthClient = new OAuthClient({
        clientId: qbConfig.qb_client_id,
        clientSecret: qbConfig.qb_client_secret,
        environment: qbConfig.qb_environment,
        redirectUri: query.redirectUri || qbConfig.qb_redirect_uri,
    });
    
    oauthClient
    .createToken(req.url)
    .then(function (authResponse: any) {

        // var oauth2_token_json: any = JSON.stringify(authResponse.getJson(), null, 2);
      
        const companyId = req.query.state
        const refresh_token = authResponse.token.refresh_token
        const access_token = authResponse.token.access_token
        const realmId = req.query.realmId

        Company.findById(companyId, (err: any, company: ICompany) => {
            if(err){
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            if(company == undefined || company ==null){
                return res.json({'status': Status.Error, 'message': "Invalid company id"})
            }

            // Initiate node-quickbooks object with the refreshed company token
            const qbo = _getQbo(access_token, realmId, refresh_token);

            // Find the QuickBooks company info to be saved to Company Object
            qbo.findCompanyInfos({}, (err: any, data: any) => {

                const qbCompany: IQBCompany = data?.QueryResponse?.CompanyInfo[0];

                var expiry = new Date();
                expiry.setDate(expiry.getDate() + 99);
                company.updateOne({
                    qbAccessToken: access_token,
                    qbRefreshToken: refresh_token,
                    realmId: realmId,
                    qbCompanyName: qbCompany?.CompanyName,
                    qbCompanyEmail: qbCompany?.Email?.Address,
                    qbAuthorized: true,
                    qbRefeshTokenExpiry: expiry
                }, (err: any, raw: any)=>{
                    if(err){
                        sio.emit(company.socketId, {'status': Status.Error, 'message': Messages.GenericError});
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }

                    // sio.emit("authToken", oauth2_token_json);

                    sio.emit(company.socketId, {'status': Status.Success, 'message': 'Quickbooks Connected Successfully'});
                    return res.json({ 'status': Status.Success, 'message': 'Quickbooks Connected Successfully' });
                })
            })
        })
    })
    .catch(function (err: any) {
        return res.json({'status': Status.Error, 'message': err.error_description || err.originalMessage || err.message || Messages.GenericError});
    });
}

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
        })
    })

}

const _getCustomers = (req: Request, res: Response, company: ICompany, next: (req: Request, res: Response, error: number, errorMessage: string, customers: any) => void) => {

    var qbo = new QuickBooks(qbConfig.qb_client_id,
        qbConfig.qb_client_secret,
        company.qbAccessToken,
        false, // no token secret for oAuth 2.0
        company.realmId,
        true, // use the sandbox?
        false, // enable debugging?
        14, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        company.qbRefreshToken
    );


    qbo.findCustomers( [{field: 'fetchAll', value: true} ], 
        function(qbError: any, customers: any) {
            
            var errorMessage: string
            if (qbError != null && Object.keys(qbError).length != 0) {

                if(qbError.hasOwnProperty("fault")){
                
                    if(qbError.fault.error[0].message.length != 0 && qbError.fault.error[0].message.split('; ')[2].replace('statusCode=','') == 401) {

                        _refreshToken(req, res, company, (error: number, newErrorMessage: string, newCompany: ICompany) => { 

                            if(error == 0) {
                                next(req,res, error, newErrorMessage, [])
                                return 
                            }

                            if(error == 400) {
                                next(req,res, error, newErrorMessage, [])
                                return 
                            }

                            qbo = new QuickBooks(qbConfig.qb_client_id,
                                qbConfig.qb_client_secret,
                                newCompany.qbAccessToken,
                                false, // no token secret for oAuth 2.0
                                newCompany.realmId,
                                true, // use the sandbox?
                                false, // enable debugging?
                                14, // set minorversion, or null for the latest version
                                '2.0', //oAuth version
                                newCompany.qbRefreshToken
                            );

                            qbo.findCustomers( [{field: 'fetchAll', value: true} ], 
                                function(qbErrorNew: any, customers2: any) {
                                    if (qbErrorNew != null && Object.keys(qbErrorNew).length != 0) {

                                        if(qbErrorNew.hasOwnProperty("fault")){
                                            if(qbErrorNew.fault.error[0].detail.length != 0) {
                                                errorMessage = qbErrorNew.fault.error[0].message

                                            }else{
                                                errorMessage = qbErrorNew.fault.error[0].detail
                                            }

                                            next(req,res, 0, errorMessage, [])
                                            return 

                                        } else if(qbErrorNew.hasOwnProperty("Fault")){
                                            errorMessage = qbErrorNew.Fault.Error[0].Message
                                            next(req,res, 0, errorMessage, [])
                                            return 
                                        }

                                    }else{
                                        next(req,res, 1, '', customers2)
                                        return
                                    }
                                }
                            )
                        })


                    }else if(qbError.fault.error[0].detail.length != 0) {
                        errorMessage = qbError.fault.error[0].message
                        next(req,res, 0, errorMessage, [])
                        return 

                    }else{
                        errorMessage = qbError.fault.error[0].detail
                        next(req,res, 0, errorMessage, [])
                        return 
                    }

                } else if(qbError.hasOwnProperty("Fault")){
                    errorMessage = qbError.Fault.Error[0].Message
                    next(req,res, 0, errorMessage, [])
                    return 

                }

            }else{
                next(req,res, 1, '', customers)
                return
            }
        }
    )
}

export const getQBCustomers = (req: Request, res: Response) => {

    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Company.findById(companyId, (err: any, company: ICompany) => {
        if(err) {
            return res.json({'status': Status.Error, 'message': 'No Company found.' })
        }

        if (company.customersSynced) {
            return res.json({'status': Status.Error, 'message': 'You have already synced the customers try manual sync.' })
        }

        if(!company.qbAuthorized) {
            return res.json({'status': Status.QBUnauthorized, 'message': Messages.QBUnAuthorized })
        }

        if(company.qbAccessToken == undefined || company.qbAccessToken == null || company.qbRefreshToken == undefined || company.qbRefreshToken == null || company.realmId == undefined || company.realmId == null) {
            return res.json({'status': Status.QBUnauthorized, 'message': Messages.QBUnAuthorized })
        }

        _getCustomers(req, res, company, (req: Request, res: Response, error: number, errorMessage: string, customers: any) =>{
            if(error == 0) {
                return res.json({'status': Status.Error, 'message': errorMessage})
            }

            if(error == 400){
                company.updateOne({
                    qbAuthorized: false,
                    qbAccessToken: undefined,
                    qbRefreshToken: undefined,
                },
                (err: any, raw: any) => {
                    if(err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({'status': Status.QBUnauthorized, 'message': "Quickbooks Authorization failed."})
                })
            }

            if(customers.hasOwnProperty("QueryResponse")) {
                var importedCustomers = customers.QueryResponse.Customer

                var newCustomers: any = []
                for (let index = 0; index < importedCustomers.length; index++) {
                    const element = importedCustomers[index];
                    newCustomers.push(new Customer({
                        info: {
                            email: get(element, 'PrimaryEmailAddr.Address'),
                        },
                        profile:{
                            firstName: get(element, 'DisplayName'),
                            lastName: get(element, 'DisplayName'),
                            displayName: get(element, 'DisplayName'),
                            imageUrl: '',
                        },
                        address: {
                            street: get(element, 'BillAddr.Line1'),
                            city: get(element, 'BillAddr.City'),
                            state: get(element, 'BillAddr.CountrySubDivisionCode'),
                            zipCode: get(element, 'BillAddr.PostalCode'),
                        },
                        contact: {
                            phone: get(element ,'PrimaryPhone.FreeFormNumber'),
                        },
                        company: req.companyId,
                        permissions: {
                            role: Role.CUSTOMER,
                            extra: [],
                        },
                        quickbookId: element.Id
                    }))
                }

                if(newCustomers.length == 0) {
                    return res.json({'status': Status.Success, 'message': "Nothing to sync"})
                }
                
                Customer.collection.insert(newCustomers, function (err: any, insertedCustomers: any) {
                    if (err){ 
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    
                    } else {
                        var newCompanyCustomers: any = []
                        insertedCustomers.ops.map((cust: any) => {
                            newCompanyCustomers.push(new CompanyCustomer({
                                company: companyId,
                                customer: cust._id,
                                createdAt: Date.now()
                            }))
                        })

                        CompanyCustomer.collection.insert(newCompanyCustomers, function (err: any, docs: any) {
                            if (err){ 
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }

                            company.updateOne({
                                'customersSynced': true,
                                'customersSyncedAt': Date.now(),
                            },
                                (err: any, raw: any) => {
                                    if (err) {
                                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                    }
                                    return res.json({ 'status': Status.Success, 'message': "Customers synced successfully" })
                                })
                        })

                    }
                })
            }

        })
    })
    
}

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
        }

        // Create QB Customer
        qbo.createCustomer(qbCustomerEntry, async (err: any, qbCustomer: IQBCustomer) => {
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

            return next(null, null, qbCustomer);
        })
    })

}

/**
 * Generic function to process Customer's Job Locations,
 * will check if it is existed on QuickBooks or not
 */
const _processJobLocations = async (req: Request, res: Response, company: ICompany, qbCustomers: IQBCustomer[], customer: ICustomer) => {
    /**
     * Iterate all job locations of the customer,
     * check, then create on QB it not existed
     */
    for (const custJobLoc of customer.jobLocations) {
        const jobLocation = <IJobLocation>custJobLoc;

        // Check if job location has quickbook Id, then check if it exists or not
        if (!jobLocation.quickbookId) {

            // Find if job exist on QB
            const qbCustomerJob = qbCustomers.find(qbCustomer => !qbCustomer.Job && qbCustomer.DisplayName === jobLocation.name);

            if (!qbCustomerJob) {
                _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, async (err, errMsg, qbCustomerJob) => {
                    if (qbCustomerJob) {
                        jobLocation.quickbookId = qbCustomerJob.Id;
                        await jobLocation.save();
                    }
                })
            } else {
                // QB Cust Job exist, associated to that Job
                jobLocation.quickbookId = qbCustomerJob.Id;
                await jobLocation.save();
            }

        }
    }
}

/**
 * Generic function to create QuickBooks Customer Job,
 * this used by Job Location Controller when creating new job location,
 * and this contoller when syncing customer job
 */
export const _createQBCustomerJob = async (req: Request, res: Response, company: ICompany, jobLocation: IJobLocation, parentQBCustomerId: string, next: (error: number, errorMessage: string, qbCustomerJob: any) => void) => {

    // Populate the job location to have customer object
    await jobLocation
        .populate({ path: 'customerId' })
        .populate({ path: 'contacts '})
        .execPopulate();

    // Customer of the job location
    const customer = <ICustomer>jobLocation.customerId;
    const contact = <IContact>jobLocation.contacts[0];

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

        // Construct QB Customer Entry
        const qbCustomerEntry: IQBCustomer = {
            PrimaryEmailAddr: {
                Address: customer?.info?.email
            },
            DisplayName: jobLocation.name,
            GivenName: contact?.name?.split(/[ ,]+/)[0] || customer?.profile?.firstName,
            FamilyName: contact?.name?.split(/[ ,]+/)[1] || customer?.profile?.lastName,
            CompanyName: customer?.profile?.displayName,
            Job: true,
            ParentRef: { value: parentQBCustomerId },
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
                Line1: jobLocation?.address?.street,
                City: jobLocation?.address?.city,
                CountrySubDivisionCode: jobLocation?.address?.state,
                PostalCode: jobLocation?.address?.zipcode,
                Long: jobLocation?.location?.coordinates[0]?.toString(),
                Lat: jobLocation?.location?.coordinates[1]?.toString(),
            }
        }

        // Create QB Customer
        qbo.createCustomer(qbCustomerEntry, async (err: any, qbCustomer: IQBCustomer) => {
            if (err) {
                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError,
                    null
                )
            }

            return next(null, null, qbCustomer);
        })
    })

}

/**
 * To create customer in QuickBooks,
 * and associate it with a certain customer
 */
export const createQBCustomer = async (req: Request, res: Response) => {

    const params = req.body
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    const companyCustomer = await CompanyCustomer.findOne({ company: companyId, customer: params.customerId });

    if (!companyCustomer) {
        return res.json({ status: Status.Error, message: 'Customer not found' });
    }

    const customer = await Customer.findById(params.customerId);

    Company.findById(companyId, (err: any, company: ICompany) => {
        if(err) {
            return res.json({'status': Status.Error, 'message': 'No company found.' })
        }

        if(!company.qbAuthorized) {
            return res.json({'status': Status.QBUnauthorized, 'message': Messages.QBUnAuthorized })
        }

        if(company.qbAccessToken == undefined || company.qbAccessToken == null || company.qbRefreshToken == undefined || company.qbRefreshToken == null || company.realmId == undefined || company.realmId == null) {
            return res.json({'status': Status.QBUnauthorized, 'message': Messages.QBUnAuthorized })
        }

        var qbo = new QuickBooks(qbConfig.qb_client_id,
            qbConfig.qb_client_secret,
            company.qbAccessToken,
            false, // no token secret for oAuth 2.0
            company.realmId,
            true, // use the sandbox?
            false, // enable debugging?
            14, // set minorversion, or null for the latest version
            '2.0', //oAuth version
            company.qbRefreshToken
        );

        // Construct QB Customer Entry
        const qbCustomerEntry: IQBCustomer = {
            PrimaryEmailAddr: {
                Address: params.email || customer.info?.email
            },
            DisplayName: params.name || customer.profile?.displayName,
            GivenName: customer.profile?.firstName,
            FamilyName: customer.profile?.lastName,
            CompanyName: company.info?.companyName,
            PrimaryPhone: {
                FreeFormNumber: params.phone || customer.contact?.phone
            },
            BillAddr: {
                Line1: params.street || customer.address?.street,
                Line2: customer.address?.unit,
                City: params.city || customer.address?.city,
                CountrySubDivisionCode: params.state || customer.address?.state,
                PostalCode: params.zipCode || customer.address?.zipCode,
                Long: customer.location?.coordinates[0]?.toString(),
                Lat: customer.location?.coordinates[1]?.toString(),
            }
        };

        qbo.createCustomer(qbCustomerEntry, async (err: any, qbCustomer: IQBCustomer) => {
            
            if (err != null && Object.keys(err).length != 0) {
                
                if(err.hasOwnProperty("fault")){
                
                    if(err.fault.error[0].message.length != 0 && err.fault.error[0].message.split('; ')[2].replace('statusCode=','') == 401) {
                        
                        _refreshToken(req, res, company, (error: number, newErrorMessage: string, newCompany: ICompany) => { 

                            if(error == 0) {

                                return res.json({'status': Status.Error, 'message': newErrorMessage})
                            }

                            if(error == 400){

                                company.updateOne({
                                    qbAuthorized: false,
                                    qbAccessToken: undefined,
                                    qbRefreshToken: undefined,
                                },
                                (err: any, raw: any) => {
                                    if(err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError })
                                    }

                                    return res.json({'status': Status.QBUnauthorized, 'message': "Quickbooks Authorization failed."})
                                })
                            }
                            
                            qbo = new QuickBooks(qbConfig.qb_client_id,
                                qbConfig.qb_client_secret,
                                newCompany.qbAccessToken,
                                false, // no token secret for oAuth 2.0
                                newCompany.realmId,
                                true, // use the sandbox?
                                false, // enable debugging?
                                14, // set minorversion, or null for the latest version
                                '2.0', //oAuth version
                                newCompany.qbRefreshToken
                            );
                            qbo.createCustomer(customer, async (newError: any, qbCustomer: IQBCustomer) => { 
                                if (newError != null && Object.keys(newError).length != 0) {

                                    if(newError.hasOwnProperty("fault")){
                                        if(newError.fault.error[0].detail.length == 0) {
                                            return res.json({'status': Status.Error, 'message': newError.fault.error[0].message})
                    
                                        }else{
                                            return res.json({'status': Status.Error, 'message': newError.fault.error[0].detail})
                                        }

                                    } else if(newError.hasOwnProperty("Fault")){
                                        return res.json({'status': Status.Error, 'message': newError.Fault.Error[0].Message})
                                    }
                                 
                                } else {
                                    customer.quickbookId = qbCustomer.Id;
                                    await customer.save();

                                    // Populate job locations of customer
                                    await customer.populate({ path: 'jobLocations' }).execPopulate();

                                    /**
                                     * Iterate all job locations of the customer,
                                     * check, then create on QB it not existed
                                     */
                                    for (const custJobLoc of customer.jobLocations) {
                                        const jobLocation = <IJobLocation>custJobLoc;

                                        // Check if job location doesn't have associated quickbookId
                                        if (!jobLocation.quickbookId) {
                                            _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, (err, errMsg, qbCustomerJob) => {
                                                if (qbCustomerJob) {
                                                    jobLocation.quickbookId = qbCustomerJob.Id;
                                                    jobLocation.save();
                                                }
                                            })
                                        }
                                    }

                                    return res.json({ status: Status.Success, message: 'QB Customer created successfully.', updatedCustomer: customer, quickbookCustomer: qbCustomer });
                                }
                            })
                            
                        })


                    }else if(err.fault.error[0].detail.length != 0) {
                        return res.json({'status': Status.Error, 'message': err.fault.error[0].message})

                    }else{
                        return res.json({'status': Status.Error, 'message': err.fault.error[0].detail})
                        
                    }

                } else if(err.hasOwnProperty("Fault")){
                    return res.json({'status': Status.Error, 'message': err.Fault.Error[0].Message})
                }
                
            } else {
                customer.quickbookId = qbCustomer.Id;
                await customer.save();

                // Populate job locations of customer
                await customer.populate({ path: 'jobLocations' }).execPopulate();

                /**
                 * Iterate all job locations of the customer,
                 * check, then create on QB it not existed
                 */
                for (const custJobLoc of customer.jobLocations) {
                    const jobLocation = <IJobLocation>custJobLoc;

                    // Check if job location doesn't have associated quickbookId
                    if (!jobLocation.quickbookId) {
                        _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, (err, errMsg, qbCustomerJob) => {
                            if (qbCustomerJob) {
                                jobLocation.quickbookId = qbCustomerJob.Id;
                                jobLocation.save();
                            }
                        })
                    }
                }

                return res.json({ status: Status.Success, message: 'QB Customer created successfully.', updatedCustomer: customer, quickbookCustomer: qbCustomer });
            }
        })
    })

}

export const syncQBCustomers = async (req: Request, res: Response) => {

    const user = <IUser>req.user;
    const createdCustomers: { _id: string, name: string }[] = [];
    const updatedCustomers: { _id: string, name: string }[] = [];
    let custsToCreate: ICustomer[] = [];
    let compCustsToCreate: ICompanyCustomer[] = [];
    let jobLocationToCreate: IJobLocation[] = [];

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

        // Find customers from DB and populate its jobLocations
        const customers = await Customer.find({ company: company._id }).populate({ path: 'jobLocations' });

        qbo.findCustomers({}, async (err: any, data: any) => {
            if (err) {
                return res.json({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                })
            }

            const qbCustomers: IQBCustomer[] = data?.QueryResponse?.Customer;

            // Iterate all customers from DB
            for (const customer of customers) {
                const qbCustomer = qbCustomers?.find((qbCustomer: IQBCustomer) => qbCustomer.PrimaryEmailAddr?.Address?.toLowerCase() === customer.info?.email?.toLowerCase());

                // Customer not exist on QB, create it
                if (!qbCustomer) {
                    _createQBCustomer(req, res, company, customer, async (err, errMsg, qbCustomer) => {
                        if (qbCustomer) {
                            // QB Customer created, update DB Customer's quickbookId
                            Customer.findByIdAndUpdate(customer._id, { quickbookId: qbCustomer.Id }).exec();

                            _processJobLocations(req, res, company, qbCustomers, customer);
                        }
                    })
                } else {
                    Customer.findByIdAndUpdate(customer._id, { quickbookId: qbCustomer.Id }).exec();

                    _processJobLocations(req, res, company, qbCustomers, customer);
                }
            }

            // Split and filter QuickBooks' only customers for this phase
            const qbCustomersOnly = qbCustomers.filter(qbCustomer => !qbCustomer.Job);

            // Iterate all QuickBooks customers only
            for (const qbCustomer of qbCustomersOnly) {

                // Check if there any customer on QB that not on DB yet
                const customer = customers.find(customer => {
                    if (customer.info?.email?.toLowerCase() === qbCustomer.PrimaryEmailAddr?.Address?.toLowerCase() || customer.quickbookId === qbCustomer.Id) {
                        return customer;
                    }
                });

                if (customer) {
                    // Customer found, check and update quickbookId
                    if (customer.quickbookId !== qbCustomer.Id) {
                        Customer.findByIdAndUpdate(customer._id, { quickbookId: qbCustomer.Id }).exec();

                        updatedCustomers.push({ _id: customer._id, name: customer.profile?.displayName });
                    }
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
                        contact: { phone: qbCustomer.PrimaryPhone?.FreeFormNumber, },
                        contacts: [
                            await new Contact({
                                name: [qbCustomer.GivenName, qbCustomer.FamilyName].join(' ').trim() || qbCustomer.DisplayName,
                                phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
                                email: qbCustomer.PrimaryEmailAddr?.Address
                            }).save()
                        ],
                        company: company._id,
                        permissions: { role: Role.CUSTOMER, extra: [] },
                        quickbookId: qbCustomer.Id,
                    });

                    if (qbCustomer.BillAddr?.Long && qbCustomer.BillAddr?.Lat) {
                        custEntry.location = {
                            coordinates: [Number(qbCustomer.BillAddr?.Long), Number(qbCustomer.BillAddr?.Lat)]
                        }
                    }

                    custsToCreate.push(custEntry);
                }
            }

            if (custsToCreate.length > 0) {
                // Iterate customer to be create to create Company Customer entries
                for (const customer of custsToCreate) {
                    createdCustomers.push({ _id: customer._id, name: customer.profile?.displayName });
                    compCustsToCreate.push(
                        new CompanyCustomer({
                            company: company._id,
                            customer: customer._id,
                            createdAt: Date.now()
                        })
                    )
                }

                // Create all customers to DB at once
                Customer.create(custsToCreate);
                // Create all company customers to DB at once
                CompanyCustomer.create(compCustsToCreate);
            }

            // Split and filter QuickBooks' only jobs for this phase
            const qbCustomerJobs = qbCustomers.filter(qbCustomer => qbCustomer.Job);

            // Iterate all QuickBooks jobs only
            for (const qbCustJob of qbCustomerJobs) {
                // Find BC customer based on customer quickbookId as the parent customer of QB job
                let parentCustomer = customers.find(customer => customer.quickbookId === qbCustJob.ParentRef?.value);

                /**
                 * No customer found, find on customer entries to be create,
                 * as probably it is a new customer as well from QB
                 */
                if (!parentCustomer) {
                    parentCustomer = custsToCreate.find(customer => customer.quickbookId === qbCustJob.ParentRef?.value);
                }

                // Find if job location already exist on the customer's job locations
                const jobLocation = <IJobLocation>parentCustomer.jobLocations?.find((jl: IJobLocation) => jl.quickbookId === qbCustJob.Id);

                // Job location not found, create a new one
                if (!jobLocation) {
                    const jobLocationEntry = new JobLocation({
                        name: qbCustJob.DisplayName,
                        address: {
                            street: qbCustJob.BillAddr?.Line1,
                            city: qbCustJob.BillAddr?.City,
                            state: qbCustJob.BillAddr?.CountrySubDivisionCode,
                            zipcode: qbCustJob.BillAddr?.PostalCode
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

                    if (qbCustJob.BillAddr?.Lat && qbCustJob.BillAddr?.Long) {
                        jobLocationEntry.location = {
                            coordinates: [
                                Number(qbCustJob.BillAddr?.Long),
                                Number(qbCustJob.BillAddr?.Lat)
                            ]
                        }
                    }

                    jobLocationToCreate.push(jobLocationEntry);
                    Customer.findByIdAndUpdate(parentCustomer._id, { $push: { jobLocations: jobLocationEntry._id } }).exec();
                }
            }

            // Create all job locations to DB at once
            JobLocation.create(jobLocationToCreate);

            company.qbSync.customersSynced = true;
            company.qbSync.customersSyncedAt = new Date();
            company.save();

            return res.json({ status: Status.Success, message: 'Customer synced successfully.', createdCustomers, updatedCustomers });
        })
    })

}

// ================================
// =======[ QUICKBOOK ITEM ]=======
// ================================

const _getQBItems = async (qbo: any): Promise<IQBItem[]> => {

    return new Promise((resolve, reject) => {
        qbo.findItems({}, (err: any, data: any) => {
            if (err) {
                reject({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                });
            }

            resolve(<IQBItem[]>data?.QueryResponse?.Item);
        })
    })

}

/**
 * Generic function to create QuickBooks Item,
 * this used by Job Type Controller when creating new Job Type & Item,
 * and this controller when syncing items
 */
export const _createQBItem = async (req: Request, res: Response, company: ICompany, item: IItem, next: (error: number, errorMessage: string, qbItem: IQBItem) => void) => {

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

        // Construct QB Item Entry
        const qbItemEntry: IQBItem = {
            Name: item.name,
            Type: QBItemTypes.SERVICE,
            Active: item.isActive,
            SalesTaxIncluded: false,
            IncomeAccountRef: { name: 'Sales of Product Income', value: '79' },
            MetaData: { CreateTime: new Date(), LastUpdatedTime: new Date() }
        };

        // Create QB Item
        qbo.createItem(qbItemEntry, async (err: any, qbItem: IQBItem) => {
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

            return next(null, null, qbItem);
        })
    });

}

/**
 * To syncing items on DB and items on QB
 */
export const syncQBItems = async (req: Request, res: Response) => {

    const user = <IUser>req.user;
    const jobTypesToCreate: IJobType[] = [];
    const itemsToCreate: IItem[] = [];
    const createdItems: { _id: string, name: string }[] = [];
    const updatedItems: { _id: string, name: string }[] = [];

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

        // Retrieve all items of this company from Database
        const items = await Item.find({ company: company._id });

        // Retrieve all items of this company from QuickBooks
        qbo.findItems({}, async (err: any, data: any) => {
            if (err) {
                return res.json({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                })
            }

            const qbItems: IQBItem[] = data?.QueryResponse?.Item;

            // Iterate all items from DB
            for (const item of items) {
                // Check if there any item on DB that not on QB yet
                const exist = qbItems?.find((qbItem: IQBItem) => qbItem.Name?.toLowerCase() === item.name.toLowerCase());

                // Item not exist on QB, create it
                if (!exist) {
                    _createQBItem(req, res, company, item, (err, errMsg, qbItem) => {
                        if (qbItem) {
                            // QB Item created, update DB Item & JobType's quickbookId
                            item.quickbookId = qbItem.Id;
                            item.save();
                            JobType.findByIdAndUpdate(item.jobType, { quickbookId: qbItem.Id }).exec();
                        }
                    })
                }
            }

            // Iterate all QuickBooks items
            for (const qbItem of qbItems) {
                // Check if there any item on QB that not on DB yet
                let item = items.find(item => item.name?.toLowerCase() === qbItem.Name?.toLowerCase());

                if (item) {
                    // Item found, check and update quickbookId
                    if (item.quickbookId !== qbItem.Id) {
                        item.quickbookId = qbItem.Id;
                        item.save();

                        updatedItems.push({ _id: item._id, name: item.name });
                    }
                } else {
                    // Item not found, find any similar Job Type
                    let jobType = await JobType.findOne({
                        title: { $regex: new RegExp(`^${qbItem.Name}$`, 'i') },
                        createdBy: user._id
                    });

                    // Job Type not found, create it
                    if (!jobType) {
                        // Collect all Job Types in array first
                        jobTypesToCreate.push(new JobType({
                            title: qbItem.Name,
                            createdBy: user._id,
                            quickbookId: qbItem.Id
                        }));
                    }
                }
            }

            // Iterate array Job Types to be created
            if (jobTypesToCreate.length > 0) {
                // Create all Job Types in array at once
                const jobTypesCreated = await JobType.create(jobTypesToCreate);

                // Iterate all created Job Types
                for (const jobType of jobTypesCreated) {
                    // Collect all Items in array first
                    itemsToCreate.push(new Item({
                        name: jobType.title,
                        tiers: [...company.itemTier?.list],
                        company: company._id,
                        jobType: jobType._id,
                        quickbookId: jobType.quickbookId,
                    }))
                }

                // Create all Items in array at once
                const itemsCreated = await Item.create(itemsToCreate);

                // Iterate all created Items as the response information
                for (const item of itemsCreated) {
                    createdItems.push({ _id: item._id, name: item.name });
                }
            }

            company.qbSync.itemsSynced = true;
            company.qbSync.itemsSyncedAt = new Date();
            company.save();

            return res.json({ status: Status.Success, message: 'Item synced successfully.', createdItems, updatedItems });
        })
    })

}

// ===================================
// =======[ QUICKBOOK INVOICE ]=======
// ===================================

/**
 * Generic function to create QuickBooks Invoice,
 * this used by Invoice Controller when creating new invoice,
 * and this contoller when syncing invoices
 */
 export const _createQBInvoice = async (req: Request, res: Response, company: ICompany, invoice: IInvoice, next: (error: number, errorMessage: string, qbInvoice: IQBInvoice) => void) => {

    // Populate the invoice to have customer and item object
    await invoice
        .populate({ path: 'customer' })
        .populate({
            path: 'job',
            populate: [{
                path: 'ticket',
                populate: [{ path: 'customerContactId' }]
            }, { path: 'jobLocation' }]
        })
        .populate({ path: 'items.item' })
        .execPopulate();

    // Customer of the invoice
     const customer = <ICustomer>invoice.customer;
     const job = <IJob>invoice.job;
     const serviceTicket = <IServiceTicket>job?.ticket;
     const jobLocation = <IJobLocation>job?.jobLocation;
     const customerContact = <IContact>serviceTicket?.customerContactId;

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

        const qbInvoiceLines: IQBInvoiceLine[] = [];
        // Iterate all items in the invoice and construct is to QB Inv Lines
        for (const invItem of invoice.items) {
            const item = <IItem>invItem.item;

            qbInvoiceLines.push({
                DetailType: LineDetailTypes.SalesItemLineDetail,
                Amount: invItem.subTotal,
                SalesItemLineDetail: {
                    ItemRef: {
                        value: item.quickbookId
                    },
                    Qty: invItem.quantity,
                    UnitPrice: invItem.price,
                }
            });
        }

        if (invoice.subTotal) {
            qbInvoiceLines.push({
                DetailType: LineDetailTypes.SubTotalLineDetail,
                Amount: invoice.subTotal,
                SalesItemLineDetail: {}
            });
        }

        // QB Invoice Object
        const qbInvoiceEntry: IQBInvoice = {
            DocNumber: invoice.invoiceId,
            TxnDate: invoice.issuedDate?.toString(),
            DueDate: invoice.dueDate?.toString() || invoice.createdAt?.toString(),
            Line: qbInvoiceLines,
            CustomerRef: {
                value: jobLocation?.quickbookId || customer.quickbookId
            },
            BillEmail: { Address: customer.info?.email },
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
            },
            CustomField: [
                {
                    DefinitionId: '1',
                    Name: 'Customer PO',
                    Type: 'StringType',
                    StringValue: serviceTicket?.customerPO
                },
                {
                    DefinitionId: '2',
                    Name: 'Vendor Number',
                    Type: 'StringType',
                    StringValue: customer.vendorId
                }
            ]
        };

        if (jobLocation) {
            qbInvoiceEntry.ShipAddr.Line1 = jobLocation.address?.street || null;
            qbInvoiceEntry.ShipAddr.Line2 = null;
            qbInvoiceEntry.ShipAddr.City = jobLocation.address?.city || null;
            qbInvoiceEntry.ShipAddr.CountrySubDivisionCode = jobLocation.address?.state || null;
            qbInvoiceEntry.ShipAddr.PostalCode = jobLocation.address?.zipcode || null;
            qbInvoiceEntry.ShipAddr.Long = jobLocation.location?.coordinates[0]?.toString() || null;
            qbInvoiceEntry.ShipAddr.Lat = jobLocation.location?.coordinates[1]?.toString() || null;
        }

        // Fill in Customer Contact associated if any
        if (customerContact) {
            qbInvoiceEntry.CustomerMemo = {
                value: `ORDERED BY:\n${customerContact?.name}`
            }
        }

        // Create QB Invoice
        qbo.createInvoice(qbInvoiceEntry, async (err: any, qbInvoice: IQBInvoice) => {
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

            return next(null, null, qbInvoice);
        });
    })

}

export const createQBInvoice = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const invoice = await Invoice.findOne({ _id: params.invoiceId, company: company._id });

    if (!invoice) {
        return res.json({ status: Status.Error, message: 'Invoice not found.' });
    }

    if (invoice.invoiceType === 3) {
        return res.json({ status: Status.Success, message: 'Manual invoice cannot be synced to QB.' });
    }

    _createQBInvoice(req, res, company, invoice, async (err, errMsg, qbInvoice) => {
        if (err || !qbInvoice) {
            return res.json({
                status: err || Status.Error,
                message: errMsg || Messages.GenericError
            });
        }

        invoice.quickbookId = qbInvoice.Id;
        await invoice.save();

        return res.json({ status: Status.Success, message: 'QuickBooks Invoice successfully created', invoice, quickbookInvoice: qbInvoice });
    })

}

export const syncQBInvoices = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    /**
     * Retrieve all invoices of this company from Database,
     * that not a manual invoice and doesn't have quickbookId 
     */ 
    const invoices = await Invoice.find({
        company: company._id,
        invoiceType: { $ne: 3 },
        quickbookId: { $exists: false }
    });

    // Return immediately when no invoices to be synced
    if (invoices.length <= 0) {
        return res.json({ status: Status.Success, message: 'No invoices to be synced.' });
    }

    // Iterate all invoices from DB
    for (const invoice of invoices) {
        // Invoice not exist on QB, create it
        _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
            if (qbInvoice) {
                invoice.quickbookId = qbInvoice.Id;
                invoice.save();
            }
        })
    }

    company.qbSync.invoicesSynced = true;
    company.qbSync.invoicesSyncedAt = new Date();
    company.save();

    return res.json({ status: Status.Success, message: 'Invoice synced successfully.' });

}

/**
 * Kris' remark (July 21st, 2021):
 * These commented below used to sync invoices from QB to BC
 */
// export const syncQBInvoices = async (req: Request, res: Response) => {

//     const user = <IUser>req.user;
//     const createdInvoices: { _id: string, invoiceId: string }[] = [];
//     const updatedInvoices: { _id: string, invoiceId: string }[] = [];
//     const invToCreate: IInvoice[] = [];

//     // Always refresh the token first because token valid only for 60 minutes
//     _refreshToken(req, res, req.company, async (err, errMsg, company) => {
//         if (err === 0)
//             return res.json({ status: Status.Error, message: errMsg });

//         if (err === 400) {
//             await Company.findByIdAndUpdate(req.company._id, {
//                 qbAuthorized: false,
//                 qbAccessToken: undefined,
//                 qbRefreshToken: undefined
//             });

//             return res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
//         }

//         // Initiate node-quickbooks object with the refreshed company token
//         const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

//         // Retrieve all invoices of this company from Database
//         const invoices = await Invoice.find({ company: company._id });
//         const customers = await Customer.find({ company: company._id });
//         const items = await Item.find({ company: company._id });

//         const [qbCustomers, qbItems] = await Promise.all([
//             _getQBCustomers(qbo),
//             _getQBItems(qbo)
//         ])

//         // Retrieve all invoices of this company from QuickBooks
//         qbo.findInvoices({}, async (err: any, data: any) => {
//             if (err) {
//                 return res.json({
//                     status: Status.Error,
//                     message: err.Fault?.Error[0]?.Message
//                         || err.fault?.error[0]?.detail
//                         || err.fault?.error[0]?.message
//                         || Messages.GenericError
//                 })
//             }

//             const qbInvoices: IQBInvoice[] = data?.QueryResponse?.Invoice;

//             // Iterate all invoices from DB
//             for (const invoice of invoices) {
//                 // Invoice not exist on QB, create it
//                 if (invoice.invoiceType !== 3 && !invoice.quickbookId) {
//                     _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
//                         if (qbInvoice) {
//                             invoice.quickbookId = qbInvoice.Id;
//                             invoice.save();
//                         }
//                     })
//                 }
//             }

//             // Iterate all QuickBooks invoices
//             for (const qbInvoice of qbInvoices) {
//                 // Chevk if there any invoice on QB that not on DB yet
//                 let invoice = invoices.find(invoice => invoice.quickbookId === qbInvoice.Id);
                
//                 if (!invoice) {
//                     // Invoice not found, create it
//                     const customer = customers.find(customer => customer.quickbookId === qbInvoice.CustomerRef?.value);

//                     const invItems = [];
//                     let subTotal = 0, charges = 0, shippingCost = 0;

//                     for (const qbLine of qbInvoice.Line) {
//                         if (qbLine.DetailType === LineDetailTypes.SubTotalLineDetail) {
//                             subTotal = qbLine.Amount;
//                             continue;
//                         }

//                         const qbItemId = qbLine.SalesItemLineDetail?.ItemRef?.value;
//                         const item = items.find(i => i.quickbookId === qbItemId);

//                         invItems.push({
//                             item: item._id,
//                             name: item.name,
//                             isFixed: item.isFixed,
//                             hourlyRate: qbLine.SalesItemLineDetail?.UnitPrice,
//                             price: qbLine.SalesItemLineDetail?.UnitPrice,
//                             quantity: qbLine.SalesItemLineDetail?.Qty,
//                             tax: qbLine.SalesItemLineDetail?.DiscountRate,
//                             taxAmount: qbLine.SalesItemLineDetail?.DiscountAmt,
//                             subTotal: qbLine.SalesItemLineDetail?.TaxInclusiveAmt || qbLine.Amount
//                         })
//                     }

//                     invToCreate.push(new Invoice({
//                         invoiceId: qbInvoice.DocNumber,
//                         invoiceType: 0,
//                         issuedDate: qbInvoice.TxnDate,
//                         dueDate: qbInvoice.DueDate,
//                         customer: customer._id,
//                         company: company._id,
//                         note: qbInvoice.Notes,
//                         charges: 0,
//                         shippingCost: 0,
//                         taxAmount: qbInvoice.TaxTaxDetail?.TotalTax,
//                         subTotal,
//                         total: qbInvoice.TotalAmt,
//                         createdBy: user._id,
//                         createdAt: qbInvoice.Metadata?.CreateTime,
//                         items: invItems,
//                         emailHistory: [],
//                         lastEmailSent: null,
//                         quickbookId: qbInvoice.Id,
//                     }))
//                 }
//             }

//             if (invToCreate.length > 0) {
//                 const invoicesCreated = await Invoice.create(invToCreate);

//                 for (const invoice of invoicesCreated) {
//                     createdInvoices.push({ _id: invoice._id, invoiceId: invoice.invoiceId });
//                 };

//                 company.qbSync.invoicesSynced = true;
//                 company.qbSync.invoicesSyncedAt = new Date();
//                 company.save();
//             }

//             return res.json({ status: Status.Success, message: 'Invoice synced successfully.', createdInvoices, updatedInvoices });
//         })
//     })

// }
