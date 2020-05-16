import {Request, Response} from 'express'
import { Status, Messages, Role} from '../common/constants'
import { qbConfig } from '../common/config'
import { Company, ICompany } from '../models/Company'
import { Customer, ICustomer } from '../models/Customer'
import { CompanyCustomer } from '../models/CompanyCustomer'

var QuickBooks = require('node-quickbooks')
var OAuthClient = require("intuit-oauth");

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
            console.log("after get customer")
            if(error == 0) {
                console.log("inside errror is 0")
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
    console.log("syn customers is called")
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
                console.log("after get customer")
                if(error == 0) {
                    console.log("inside errror is 0")
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



export const createQBCustomer = (req: Request, res: Response) => {
    const params = req.body
   
    
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

        let customer = {
            "PrimaryEmailAddr": {
              "Address": params.email
            }, 
            "DisplayName": params.name, 
            "PrimaryPhone": {
              "FreeFormNumber": params.phone
            }, 
            "BillAddr": {
              "City": params.city, 
              "PostalCode": params.zipCode
            }, 
        }

        qbo.createCustomer(customer, function(err: any, data: any) {
            
            if (err != null && Object.keys(err).length != 0) {
                
                if(err.hasOwnProperty("fault")){
                
                    if(err.fault.error[0].message.length != 0 && err.fault.error[0].message.split('; ')[2].replace('statusCode=','') == 401) {
                        
                        _refreshToken(req, res, company, (req: Request, res: Response, newCompany: ICompany, error: number, newErrorMessage: string) => { 

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
                            qbo.createCustomer(customer, function(newError: any, data: any) { 
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
                                 
                                }else{
                                    return res.json({'status': Status.Success, 'message': 'Customer created successfully.'})
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
                
            }else{
                return res.json({'status': Status.Success, 'message': 'Customer created successfully.'})
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
        redirectUri: qbConfig.qb_redirect_uri,
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

    var oauthClient = new OAuthClient({
        clientId: qbConfig.qb_client_id,
        clientSecret: qbConfig.qb_client_secret,
        environment: qbConfig.qb_environment,
        redirectUri: qbConfig.qb_redirect_uri,
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
                    res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                
                // sio.emit("authToken", oauth2_token_json);
                
                sio.emit(company.socketId, {'status': Status.Success, 'message': 'Quickbooks Connected Successfully'});
                res.json({'status': 200})
            })
        })
    })
    .catch(function (err: any) {
      console.error(err);
    });
}

const _refreshToken = (req: Request, res: Response, company: ICompany, next: (req: Request, res: Response, company: ICompany, error: number, errorMessage: string) => void) => {

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
                next(req, res, null, 0, Messages.GenericError)
                return
            }

            Company.findById(company._id, (err: any, newCompany: ICompany) => {
                if(err){
                    next(req, res, null, 0, Messages.GenericError)
                    return
                }

                next(req, res, newCompany, 1, '')
                return
            })
        })
    })
    .catch(function (err: any) {
        next(req, res, null, err.authResponse.response.status, 'Unable to refersh the token')
        return
        
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
                
                        _refreshToken(req, res, company, (req: Request, res: Response, newCompany: ICompany, error: number, newErrorMessage: string) => { 
                
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

