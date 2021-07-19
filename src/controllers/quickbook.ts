import {Request, Response} from 'express'
import { Status, Messages, Role} from '../common/constants'
import { qbConfig } from '../common/config'

import { IUser } from '../models/User';
import { Company, ICompany } from '../models/Company'
import { Customer, ICustomer, IQBCustomer } from '../models/Customer'
import { CompanyCustomer } from '../models/CompanyCustomer'
import { IJobType, JobType } from '../models/JobType'
import { IItem, IQBItem, Item, QBItemTypes } from '../models/Item';
import { IInvoice, IQBInvoice, IQBInvoiceLine } from '../models/Invoice'

var QuickBooks = require('node-quickbooks')
var OAuthClient = require("intuit-oauth");

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


export const syncQBCustomers = (req: Request, res: Response) => {
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
        
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

        Customer.find({'company': company._id, 'quickbookId': { $ne: null }}, 'quickbookId', (err: any, companyCustomers: ICustomer[]) => {
            if(err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError })
            }

            var companyCustomerIds: any = []

            if(companyCustomers.length > 0) {
                companyCustomers.map((cust: any) =>{
                    companyCustomerIds.push(cust.quickbookId)
                })
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

                        if(companyCustomerIds.length == 0 || !companyCustomerIds.includes(element.Id)) {

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
                                    if(err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError })
                                    }
                                    return res.json({'status': Status.Success, 'message': "Customers synced successfully"})
                                })
                            })

                        }
                    })
                }
            })
        
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
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbAccessToken);

        // Construct QB Customer Entry
        const qbCustomerEntry: IQBCustomer = {
            PrimaryEmailAddr: {
                Address: customer?.info?.email
            },
            DisplayName: customer?.profile?.displayName,
            GivenName: customer?.profile?.firstName,
            FamilyName: customer?.profile?.lastName,
            CompanyName: company?.info?.companyName,
            PrimaryPhone: {
                FreeFormNumber: customer?.contact.phone
            },
            BillAddr: {
                Line1: customer?.address?.street,
                Line2: customer?.address?.unit,
                City: customer?.address?.city,
                CountrySubDivisionCode: customer?.address?.state,
                PostalCode: customer?.address.zipCode,
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

export const createQBCustomer = async (req: Request, res: Response) => {

    const params = req.body
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    const customer = await Customer.findById(params.customerId);

    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found' });
    }

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
                FreeFormNumber: params.phone || customer.contact.phone
            },
            BillAddr: {
                Line1: params.street || customer.address?.street,
                Line2: customer.address?.unit,
                City: params.city || customer.address?.city,
                CountrySubDivisionCode: params.state || customer.address?.state,
                PostalCode: params.zipCode || customer.address.zipCode,
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

                return res.json({ status: Status.Success, message: 'QB Customer created successfully.', updatedCustomer: customer, quickbookCustomer: qbCustomer });
            }
        })
    })

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
            var expiry = new Date();
            expiry.setDate(expiry.getDate() + 99);
            company.updateOne({
                qbAccessToken: access_token,
                qbRefreshToken: refresh_token,
                realmId: realmId,
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
    .catch(function (err: any) {
        return res.json({'status': Status.Error, 'message': err.error_description || err.originalMessage || err.message || Messages.GenericError});
    });
}

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
        return next(err.authResponse.response.status, 'Unable to refersh the token', null);
    });
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
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbAccessToken);

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
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbAccessToken);

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
                let item = items.find(item => item.quickbookId === qbItem.Id);

                if (item) {
                    // Item found, check and update quickbookId
                    if (!item.quickbookId) {
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

            return res.json({ status: Status.Success, message: 'Item synced successfully.', createdItems, updatedItems });
        })
    })

}

/**
 * Generic function to create QuickBooks Invoice,
 * this used by Invoice Controller when creating new invoice,
 * and this contoller when syncing invoices
 */
 export const _createQBInvoive = async (req: Request, res: Response, company: ICompany, invoice: IInvoice, next: (error: number, errorMessage: string, qbInvoice: IQBInvoice) => void) => {

    // Populate the invoice to have customer and item object
    await invoice
        .populate({ path: 'customer' })
        .populate({ path: 'items.item' })
        .execPopulate();

    // Customer of the invoice
    const customer = <ICustomer>invoice.customer;

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
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbAccessToken);

        const qbInvoiceLines: IQBInvoiceLine[] = [];
        // Iterate all items in the invoice and construct is to QB Inv Lines
        for (const invItem of invoice.items) {
            const item = <IItem>invItem.item;

            qbInvoiceLines.push({
                DetailType: 'SalesItemLineDetail',
                Amount: invItem.subTotal,
                SalesItemLineDetail: {
                    ItemRef: {
                        value: item.quickbookId
                    }
                }
            })
        }

        // QB Invoice Object
        const qbInvoiceEntry: IQBInvoice = {
            Line: qbInvoiceLines,
            CustomerRef: {
                value: customer.quickbookId
            },
        };

        // Create QB Invoice
        qbo.createInvoice(qbInvoiceEntry, async (err: any, qbInvoice: IQBInvoice) => {
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

            return next(null, null, qbInvoice);
        });
    })

}
