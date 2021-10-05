import { Request, Response } from 'express'
import { Status, Messages, Role} from '../common/constants'

import { IContact } from '../common/contact';
import { Contact } from '../models/Contact';
import { IUser } from '../models/User';
import { ICompany, Company } from '../models/Company'
import { Customer, ICustomer, IQBCustomer } from '../models/Customer'
import { JobLocation, IJobLocation } from '../models/JobLocation';
import { CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer'
import { _getQbo, _refreshToken } from '../controllers/quickbook';

var QuickBooks = require('node-quickbooks')
var OAuthClient = require("intuit-oauth");

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

    const { QB_ENVIRONMENT, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

    var qbo = new QuickBooks(QB_CLIENT_ID,
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
 * TODO: To be deprecated
 */
// export const getQBCustomers = (req: Request, res: Response) => {

//   var companyId = req.companyId;
//   if(req.otherCompanyId != undefined) {
//       companyId = req.otherCompanyId
//   }

//   Company.findById(companyId, (err: any, company: ICompany) => {
//       if(err) {
//           return res.json({'status': Status.Error, 'message': 'No Company found.' })
//       }

//       if (company.customersSynced) {
//           return res.json({'status': Status.Error, 'message': 'You have already synced the customers try manual sync.' })
//       }

//       if(!company.qbAuthorized) {
//           return res.json({'status': Status.QBUnauthorized, 'message': Messages.QBUnAuthorized })
//       }

//       if(company.qbAccessToken == undefined || company.qbAccessToken == null || company.qbRefreshToken == undefined || company.qbRefreshToken == null || company.realmId == undefined || company.realmId == null) {
//           return res.json({'status': Status.QBUnauthorized, 'message': Messages.QBUnAuthorized })
//       }

//       _getCustomers(req, res, company, (req: Request, res: Response, error: number, errorMessage: string, customers: any) =>{
//           if(error == 0) {
//               return res.json({'status': Status.Error, 'message': errorMessage})
//           }

//           if(error == 400){
//               company.updateOne({
//                   qbAuthorized: false,
//                   qbAccessToken: undefined,
//                   qbRefreshToken: undefined,
//               },
//               (err: any, raw: any) => {
//                   if(err) {
//                       return res.json({'status': Status.Error, 'message': Messages.GenericError })
//                   }

//                   return res.json({'status': Status.QBUnauthorized, 'message': "Quickbooks Authorization failed."})
//               })
//           }

//           if(customers.hasOwnProperty("QueryResponse")) {
//               var importedCustomers = customers.QueryResponse.Customer

//               var newCustomers: any = []
//               for (let index = 0; index < importedCustomers.length; index++) {
//                   const element = importedCustomers[index];
//                   newCustomers.push(new Customer({
//                       info: {
//                           email: get(element, 'PrimaryEmailAddr.Address'),
//                       },
//                       profile:{
//                           firstName: get(element, 'DisplayName'),
//                           lastName: get(element, 'DisplayName'),
//                           displayName: get(element, 'DisplayName'),
//                           imageUrl: '',
//                       },
//                       address: {
//                           street: get(element, 'BillAddr.Line1'),
//                           city: get(element, 'BillAddr.City'),
//                           state: get(element, 'BillAddr.CountrySubDivisionCode'),
//                           zipCode: get(element, 'BillAddr.PostalCode'),
//                       },
//                       contact: {
//                           phone: get(element ,'PrimaryPhone.FreeFormNumber'),
//                       },
//                       company: req.companyId,
//                       permissions: {
//                           role: Role.CUSTOMER,
//                           extra: [],
//                       },
//                       quickbookId: element.Id
//                   }))
//               }

//               if(newCustomers.length == 0) {
//                   return res.json({'status': Status.Success, 'message': "Nothing to sync"})
//               }
              
//               Customer.collection.insert(newCustomers, function (err: any, insertedCustomers: any) {
//                   if (err){ 
//                       return res.json({'status': Status.Error, 'message': Messages.GenericError})
                  
//                   } else {
//                       var newCompanyCustomers: any = []
//                       insertedCustomers.ops.map((cust: any) => {
//                           newCompanyCustomers.push(new CompanyCustomer({
//                               company: companyId,
//                               customer: cust._id,
//                               createdAt: Date.now()
//                           }))
//                       })

//                       CompanyCustomer.collection.insert(newCompanyCustomers, function (err: any, docs: any) {
//                           if (err){ 
//                               return res.json({'status': Status.Error, 'message': Messages.GenericError})
//                           }

//                           company.updateOne({
//                               'customersSynced': true,
//                               'customersSyncedAt': Date.now(),
//                           },
//                               (err: any, raw: any) => {
//                                   if (err) {
//                                       return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
//                                   }
//                                   return res.json({ 'status': Status.Success, 'message': "Customers synced successfully" })
//                               })
//                       })

//                   }
//               })
//           }

//       })
//   })
  
// }

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

export const _updateQBCustomer = async (req: Request, res: Response, company: ICompany, customer: ICustomer, parentQBCustomerId: string, next: (error: number, errorMessage: string, qbCustomer: IQBCustomer) => void) => {
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

            qbCustomer.Active = customer.isActive;
            qbCustomer.DisplayName = customer?.profile?.displayName;
            qbCustomer.GivenName = customer?.profile?.firstName;
            qbCustomer.FamilyName = customer?.profile?.lastName;
            qbCustomer.CompanyName = customer?.profile?.displayName;
            qbCustomer.PrimaryPhone = qbCustomer.PrimaryPhone ?? {};
            qbCustomer.PrimaryPhone.FreeFormNumber = customer?.contact?.phone

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
                    )
                }

                return next(null, null, qbCustomer)
            })
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
    for (const custJobLoc of customer?.jobLocations) {
        const jobLocation = <IJobLocation>custJobLoc;

        // Check if job location has quickbook Id, then check if it exists or not
        if (!jobLocation.quickbookId) {

            // Find if job exist on QB
            const qbCustomerJob = qbCustomers.find(qbCustomer => qbCustomer.Job 
                && qbCustomer.ParentRef.value === customer.quickbookId
                && qbCustomer.DisplayName === jobLocation.name);

            if (!qbCustomerJob) {
                await _createQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, async (err, errMsg, qbCustomerJob) => {
                    if (qbCustomerJob) {
                        // QB Customer Job created, update DB Job Location quickbookId
                        await JobLocation.findByIdAndUpdate(jobLocation, { quickbookId: qbCustomerJob.Id }).exec();
                    }
                })
            } else {
                // QB Cust Job exist, update DB Job Location quickbookId directly
                await JobLocation.findByIdAndUpdate(jobLocation, { quickbookId: qbCustomerJob.Id }).exec();
            }

        }
    }

}

/**
* Generic function to create QuickBooks Customer Job,
* this used by Job Location Controller when creating new job location,
* and this contoller when syncing customer job
*/
export const _createQBCustomerJob = async (req: Request, res: Response, company: ICompany, jobLocation: IJobLocation, parentQBCustomerId: string, next: (error: number, errorMessage: string, qbCustomerJob: IQBCustomer) => void) => {

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
                Address: customer?.info?.email
            },
            DisplayName: jobLocation.name,
            GivenName: contact?.name?.split(/[ ,]+/)[0] || customer?.profile?.firstName,
            FamilyName: contact?.name?.split(/[ ,]+/)[1] || customer?.profile?.lastName,
            CompanyName: customer?.profile?.displayName,
            Job: true,
            Active: jobLocation.isActive ?? true,
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
 * Generic function to update QuickBooks Customer Job,
 * this used by Job Location Controller when updating job location
 */
export const _updateQBCustomerJob = async (req: Request, res: Response, company: ICompany, jobLocation: IJobLocation, parentQBCustomerId: string, next: (error: number, errorMessage: string, qbCustomerJob: IQBCustomer) => void) => {

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

        qbo.getCustomer(jobLocation.quickbookId, async (err: any, qbCustomerJob: IQBCustomer) => {

            qbCustomerJob.DisplayName = jobLocation.name;
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

        const { QB_ENVIRONMENT, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

        var qbo = new QuickBooks(QB_CLIENT_ID,
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
                                    for (const custJobLoc of customer?.jobLocations) {
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
                for (const custJobLoc of customer?.jobLocations) {
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

        /**
         * QB authentication and token refresh successfully,
         * return the HTTP request of user directly here,
         * to avoid time out issue,
         * later we can upgrade the logic to use socket.io,
         * to tell FE the progress or notification
         */
        res.json({ status: Status.Success, message: 'Customer syncing in the background, try to refresh the page later' });

        // Find customers from DB and populate its jobLocations
        let customers = await Customer.find({ company: company._id }).populate({ path: 'jobLocations' });

        qbo.findCustomers({ fetchAll: true }, async (err: any, data: any) => {
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
                    await _createQBCustomer(req, res, company, customer, async (err, errMsg, qbCustomer) => {
                        if (qbCustomer) {
                            // QB Customer created, update DB Customer quickbookId
                            customer.quickbookId = qbCustomer.Id;
                            await customer.save();

                            await _processJobLocations(req, res, company, qbCustomers, customer);
                        }
                    })
                } else {
                    // QB Customer exist, update DB Customer quickbookId directly
                    customer.quickbookId = qbCustomer.Id;
                    await customer.save();

                    await _processJobLocations(req, res, company, qbCustomers, customer);
                }
            }

            // Split and filter QuickBooks' only customers for this phase
            const qbCustomersOnly = qbCustomers.filter(qbCustomer => !qbCustomer.Job);

            // Iterate all QuickBooks customers only
            for (const qbCustomer of qbCustomersOnly) {
                // Check if there any customer on QB that not on DB yet
                const customer = customers.find(customer => {
                    if (
                        (customer.info?.email?.toLowerCase() === qbCustomer.PrimaryEmailAddr?.Address?.toLowerCase()
                        && customer.profile?.displayName.toLowerCase() === qbCustomer.DisplayName.toLowerCase())
                        || customer.quickbookId === qbCustomer.Id
                    ) {
                        return customer;
                    }
                });

                if (customer) {
                    // Customer found, check and update quickbookId
                    if (customer.quickbookId !== qbCustomer.Id) {
                        customer.quickbookId = qbCustomer.Id;
                        await customer.save();

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

                    custsToCreate.push(custEntry);
                    // Save the new customer from QB
                    await custEntry.save();
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

                // Create all company customers to DB at once
                await CompanyCustomer.create(compCustsToCreate);
            }

            // Split and filter QuickBooks' only jobs level 1 for this phase
            const qbCustomerJobs = qbCustomers.filter(qbCustomer => qbCustomer.Job && qbCustomer.Level === 1);

            // Update customers data from DB and populate its jobLocations
            customers = await Customer.find({ company: company._id }).populate({ path: 'jobLocations' });

            // Iterate all QuickBooks jobs only
            for (const qbCustJob of qbCustomerJobs) {
                // Find BC customer based on customer quickbookId as the parent customer of QB job
                let parentCustomer = customers.find(customer => customer.quickbookId === qbCustJob.ParentRef?.value);

                /**
                 * No parent customer found, find on customer entries to be create,
                 * as probably it is a new customer as well from QB
                 */
                if (!parentCustomer) {
                    parentCustomer = custsToCreate.find(customer => customer.quickbookId === qbCustJob.ParentRef?.value);
                }

                if (!parentCustomer) {
                    /**
                     * Parent Customer still not found,
                     * TODO: need to collect the information and send through notifacation or email
                     */
                    continue;
                }

                // Find if job location already exist on the customer's job locations
                const jobLocation = <IJobLocation>parentCustomer?.jobLocations?.find((jl: IJobLocation) => {
                    return (jl.quickbookId === qbCustJob.Id || jl.name === qbCustJob.DisplayName);
                });

                if (jobLocation) {
                    if (jobLocation.quickbookId !== qbCustJob.Id) {
                        await JobLocation.findByIdAndUpdate(jobLocation._id, { quickbookId: qbCustJob.Id }).exec();
                    }
                } else {
                    // Job location not found, create a new one
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
        })
    })

}

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
                customer = await Customer.findOne({ quickbookId: qbCustomer.Id });

                // Update Customer data based on QB Customer
                customer.isActive = qbCustomer.Active;
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
                customer.address.state = qbCustomer.BillAddr?.CountrySubDivisionCode ;
                customer.address.zipCode = qbCustomer.BillAddr?.PostalCode;

                await customer.save();
            } else {
                // Get BC Job Location by QB Customer Job's quickbookId
                jobLocation = await JobLocation.findOne({ quickbookId: qbCustomer.Id });

                // Update Job Location data based on QB Customer Job
                jobLocation.name = qbCustomer.DisplayName;
                jobLocation.isActive = qbCustomer.Active;
                jobLocation.address.street = qbCustomer.ShipAddr?.Line1;
                jobLocation.address.city = qbCustomer.ShipAddr?.City;
                jobLocation.address.state = qbCustomer.ShipAddr?.CountrySubDivisionCode;
                jobLocation.address.zipcode = qbCustomer.ShipAddr?.PostalCode;

                await jobLocation.save();
            }

            return next(null, null, customer, jobLocation);
        });
    });

}
