"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const config_1 = require("../common/config");
const Company_1 = require("../models/Company");
const Customer_1 = require("../models/Customer");
const CompanyCustomer_1 = require("../models/CompanyCustomer");
var QuickBooks = require('node-quickbooks');
exports.getQBCustomers = (req, res) => {
    const params = req.body;
    var qbo = new QuickBooks(config_1.qbConfig.qb_client_id, config_1.qbConfig.qb_client_secret, params.qbAccessToken, false, // no token secret for oAuth 2.0
    params.realmId, true, // use the sandbox?
    false, // enable debugging?
    null, // set minorversion, or null for the latest version
    '2.0', //oAuth version
    params.qbRefreshToken);
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Company_1.Company.findById(companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No Company found.' });
        }
        if (company.customersSynced) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'You have already synced the customers try manual sync.' });
        }
        company.updateOne({
            'qbAccessToken': params.qbAccessToken,
            'qbRefreshToken': params.qbRefreshToken,
            'realmId': params.realmId,
            'customersSynced': true,
            'customersSyncedAt': Date.now(),
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            qbo.findCustomers({ fetchAll: true }, function (qbError, customers) {
                console.log(customers);
                if (qbError != null && Object.keys(qbError).length != 0) {
                    var errorMessage;
                    if (qbError.hasOwnProperty("fault")) {
                        if (qbError.fault.error[0].detail.length == 0) {
                            errorMessage = qbError.fault.error[0].message;
                        }
                        else {
                            errorMessage = qbError.fault.error[0].detail;
                        }
                    }
                    if (qbError.hasOwnProperty("Fault")) {
                        errorMessage = qbError.Fault.Error[0].Message;
                    }
                    return res.json({ 'status': constants_1.Status.Error, message: errorMessage });
                }
                else {
                    if (customers.hasOwnProperty("QueryResponse")) {
                        var importedCustomers = customers.QueryResponse.Customer;
                        var newCustomers = [];
                        for (let index = 0; index < importedCustomers.length; index++) {
                            const element = importedCustomers[index];
                            newCustomers.push(new Customer_1.Customer({
                                info: {
                                    email: get(element, 'PrimaryEmailAddr.Address'),
                                },
                                profile: {
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
                                    phone: get(element, 'PrimaryPhone.FreeFormNumber'),
                                },
                                company: req.companyId,
                                permissions: {
                                    role: 5 /* CUSTOMER */,
                                    extra: [],
                                },
                                quickbookId: element.Id
                            }));
                        }
                        if (newCustomers.length == 0) {
                            return res.json({ 'status': constants_1.Status.Success, 'message': "Nothing to sync" });
                        }
                        Customer_1.Customer.collection.insert(newCustomers, function (err, insertedCustomers) {
                            if (err) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                            }
                            else {
                                var newCompanyCustomers = [];
                                insertedCustomers.ops.map((cust) => {
                                    newCompanyCustomers.push(new CompanyCustomer_1.CompanyCustomer({
                                        company: companyId,
                                        customer: cust._id,
                                        createdAt: Date.now()
                                    }));
                                });
                                CompanyCustomer_1.CompanyCustomer.collection.insert(newCompanyCustomers, function (err, docs) {
                                    if (err) {
                                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                    }
                                    return res.json({ 'status': constants_1.Status.Success, 'message': "Customers Synced successfully" });
                                });
                            }
                        });
                    }
                }
            });
        });
    });
};
exports.syncQBCustomers = (req, res) => {
    const params = req.body;
    var qbo = new QuickBooks(config_1.qbConfig.qb_client_id, config_1.qbConfig.qb_client_secret, params.qbAccessToken, false, // no token secret for oAuth 2.0
    params.realmId, true, // use the sandbox?
    false, // enable debugging?
    14, // set minorversion, or null for the latest version
    '2.0', //oAuth version
    params.qbRefreshToken);
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Company_1.Company.findById(companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
        }
        Customer_1.Customer.find({ 'company': company._id, 'quickbookId': { $ne: null } }, 'quickbookId', (err, companyCustomers) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            var companyCustomerIds = [];
            if (companyCustomers.length > 0) {
                companyCustomers.map((cust) => {
                    companyCustomerIds.push(cust.quickbookId);
                });
            }
            qbo.findCustomers([
                { field: 'fetchAll', value: true }
            ], function (qbError, customers) {
                if (qbError != null && Object.keys(qbError).length != 0) {
                    var errorMessage;
                    if (qbError.hasOwnProperty("fault")) {
                        if (qbError.fault.error[0].detail.length == 0) {
                            errorMessage = qbError.fault.error[0].message;
                        }
                        else {
                            errorMessage = qbError.fault.error[0].detail;
                        }
                    }
                    if (qbError.hasOwnProperty("Fault")) {
                        errorMessage = qbError.Fault.Error[0].Message;
                    }
                    return res.json({ 'status': constants_1.Status.Error, 'message': errorMessage, 'err': qbError });
                }
                else {
                    if (customers.hasOwnProperty("QueryResponse")) {
                        var importedCustomers = customers.QueryResponse.Customer;
                        var newCustomers = [];
                        for (let index = 0; index < importedCustomers.length; index++) {
                            const element = importedCustomers[index];
                            if (companyCustomerIds.length == 0 || !companyCustomerIds.includes(element.Id)) {
                                newCustomers.push(new Customer_1.Customer({
                                    info: {
                                        email: get(element, 'PrimaryEmailAddr.Address'),
                                    },
                                    profile: {
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
                                        phone: get(element, 'PrimaryPhone.FreeFormNumber'),
                                    },
                                    company: req.companyId,
                                    permissions: {
                                        role: 5 /* CUSTOMER */,
                                        extra: [],
                                    },
                                    quickbookId: element.Id
                                }));
                            }
                        }
                        if (newCustomers.length == 0) {
                            return res.json({ 'status': constants_1.Status.Success, 'message': "Nothing to sync" });
                        }
                        Customer_1.Customer.collection.insert(newCustomers, function (err, insertedCustomers) {
                            if (err) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                            }
                            else {
                                var newCompanyCustomers = [];
                                insertedCustomers.ops.map((cust) => {
                                    newCompanyCustomers.push(new CompanyCustomer_1.CompanyCustomer({
                                        company: companyId,
                                        customer: cust._id,
                                        createdAt: Date.now()
                                    }));
                                });
                                CompanyCustomer_1.CompanyCustomer.collection.insert(newCompanyCustomers, function (err, docs) {
                                    if (err) {
                                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                    }
                                    company.updateOne({
                                        'customersSyncedAt': Date.now(),
                                    }, (err, raw) => {
                                        if (err) {
                                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                        }
                                        return res.json({ 'status': constants_1.Status.Success, 'message': "Customers synced successfully" });
                                    });
                                });
                            }
                        });
                    }
                }
            });
        });
    });
};
exports.createQBCustomer = (req, res) => {
    const params = req.body;
    var qbo = new QuickBooks(config_1.qbConfig.qb_client_id, config_1.qbConfig.qb_client_secret, params.qbAccessToken, false, // no token secret for oAuth 2.0
    params.realmId, true, // use the sandbox?
    false, // enable debugging?
    14, // set minorversion, or null for the latest version
    '2.0', //oAuth version
    params.qbRefreshToken);
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Company_1.Company.findById(companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
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
        };
        qbo.createCustomer(customer, function (err, data) {
            if (err) {
                return res.json({ 'error': err });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer created successfully.' });
        });
    });
};
const get = function (obj, key) {
    return key.split(".").reduce(function (o, x) {
        return (typeof o == "undefined" || o === null) ? '' : o[x];
    }, obj);
};
//# sourceMappingURL=quickbook.js.map