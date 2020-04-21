import {Request, Response} from 'express'
import { Status, Messages, Role} from '../common/constants'
import { qbConfig } from '../common/config'
import { Company, ICompany } from '../models/Company'
import { Customer, ICustomer } from '../models/Customer'
import { CompanyCustomer } from '../models/CompanyCustomer'

var QuickBooks = require('node-quickbooks')

export const getQBCustomers = (req: Request, res: Response) => {
    const params = req.body
    var qbo = new QuickBooks(qbConfig.qb_client_id,
        qbConfig.qb_client_secret,
        params.qbAccessToken,
        false, // no token secret for oAuth 2.0
        params.realmId,
        true, // use the sandbox?
        false, // enable debugging?
        null, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        params.qbRefreshToken);
    
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

        company.updateOne({
            'qbAccessToken': params.qbAccessToken,
            'qbRefreshToken': params.qbRefreshToken,
            'realmId': params.realmId,
            'customersSynced': true,
            'customersSyncedAt': Date.now(),
        },
        (err: any, raw: any) => {
            if(err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError })
            }

            qbo.findCustomers({fetchAll: true},
            function(qbError: any, customers: any) {
                console.log(customers)
                if (qbError != null && Object.keys(qbError).length != 0) {
                    
                    var errorMessage: string
                    if(qbError.hasOwnProperty("fault")){

                        if(qbError.fault.error[0].detail.length == 0) {
                            errorMessage = qbError.fault.error[0].message
                        }else{
                            errorMessage = qbError.fault.error[0].detail
                        }
                    }
                    
                    if(qbError.hasOwnProperty("Fault")){
                        errorMessage = qbError.Fault.Error[0].Message
                    }
                    
                    return res.json({'status': Status.Error, message: errorMessage })

                } else {

                    
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
    
                                    return res.json({'status': Status.Success, 'message': "Customers Synced successfully"})
                                })
    
                            }
                        })
                    }
                }
            })
        })
    })
    
}


export const syncQBCustomers = (req: Request, res: Response) => {
    const params = req.body
    var qbo = new QuickBooks(qbConfig.qb_client_id,
        qbConfig.qb_client_secret,
        params.qbAccessToken,
        false, // no token secret for oAuth 2.0
        params.realmId,
        true, // use the sandbox?
        false, // enable debugging?
        14, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        params.qbRefreshToken
    );
    
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
        
    Company.findById(companyId, (err: any, company: ICompany) => {
        if(err) {
            return res.json({'status': Status.Error, 'message': 'No company found.' })
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
          
            qbo.findCustomers( [
            {field: 'fetchAll', value: true}
            ], function(qbError: any, customers: any) {
                
                if (qbError != null && Object.keys(qbError).length != 0) {
                
                    var errorMessage: string
                    if(qbError.hasOwnProperty("fault")){

                        if(qbError.fault.error[0].detail.length == 0) {
                            errorMessage = qbError.fault.error[0].message
                        }else{
                            errorMessage = qbError.fault.error[0].detail
                        }
                    }
                    
                    if(qbError.hasOwnProperty("Fault")){
                        errorMessage = qbError.Fault.Error[0].Message
                    }
                    
                    return res.json({'status': Status.Error, 'message': errorMessage, 'err' : qbError })

                } else {

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
                }
            })
        
        })
    })
    
}



export const createQBCustomer = (req: Request, res: Response) => {
    const params = req.body
    var qbo = new QuickBooks(qbConfig.qb_client_id,
        qbConfig.qb_client_secret,
        params.qbAccessToken,
        false, // no token secret for oAuth 2.0
        params.realmId,
        true, // use the sandbox?
        false, // enable debugging?
        14, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        params.qbRefreshToken
    );
    
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
        
    Company.findById(companyId, (err: any, company: ICompany) => {
        if(err) {
            return res.json({'status': Status.Error, 'message': 'No company found.' })
        }

        let customer = {
            "PrimaryEmailAddr": {
              "Address": params.email
            }, 
            "DisplayName": params.name, 
            "Notes": "Created from blue.", 
            "PrimaryPhone": {
              "FreeFormNumber": params.phone
            }, 
            "BillAddr": {
              "City": params.city, 
              "PostalCode": params.zipCode
            }, 
        }

        qbo.createCustomer(customer, function(err: any, data: any) {
            if(err) {
                  
                return res.json({'error': err })
            }

            return res.json({'status': Status.Success, 'message': 'Customer created successfully.'})
        })

    })
    
}
const get = function(obj: any, key: any) {
    return key.split(".").reduce(function(o: any, x: any) {
        return (typeof o == "undefined" || o === null) ? '' : o[x];
    }, obj);
}
