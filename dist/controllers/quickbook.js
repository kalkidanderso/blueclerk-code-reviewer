"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const config_1 = require("../common/config");
const Company_1 = require("../models/Company");
const Customer_1 = require("../models/Customer");
const CompanyCustomer_1 = require("../models/CompanyCustomer");
var QuickBooks = require('node-quickbooks');
var OAuthClient = require("intuit-oauth");
var http = require('http');
var io = require("socket.io");
exports.getQBCustomers = (req, res) => {
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
        if (!company.qbAuthorized) {
            return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': constants_1.Messages.QBUnAuthorized });
        }
        if (company.qbAccessToken == undefined || company.qbAccessToken == null || company.qbRefreshToken == undefined || company.qbRefreshToken == null || company.realmId == undefined || company.realmId == null) {
            return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': constants_1.Messages.QBUnAuthorized });
        }
        _getCustomers(req, res, company, (req, res, error, errorMessage, customers) => {
            console.log("after get customer");
            if (error == 0) {
                console.log("inside errror is 0");
                return res.json({ 'status': constants_1.Status.Error, 'message': errorMessage });
            }
            if (error == 400) {
                company.updateOne({
                    qbAuthorized: false,
                    qbAccessToken: undefined,
                    qbRefreshToken: undefined,
                }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': "Quickbooks Authorization failed." });
                });
            }
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
        });
    });
};
exports.syncQBCustomers = (req, res) => {
    console.log("syn customers is called");
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Company_1.Company.findById(companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
        }
        if (!company.qbAuthorized) {
            return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': constants_1.Messages.QBUnAuthorized });
        }
        if (company.qbAccessToken == undefined || company.qbAccessToken == null || company.qbRefreshToken == undefined || company.qbRefreshToken == null || company.realmId == undefined || company.realmId == null) {
            return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': constants_1.Messages.QBUnAuthorized });
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
            _getCustomers(req, res, company, (req, res, error, errorMessage, customers) => {
                console.log("after get customer");
                if (error == 0) {
                    console.log("inside errror is 0");
                    return res.json({ 'status': constants_1.Status.Error, 'message': errorMessage });
                }
                if (error == 400) {
                    company.updateOne({
                        qbAuthorized: false,
                        qbAccessToken: undefined,
                        qbRefreshToken: undefined,
                    }, (err, raw) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': "Quickbooks Authorization failed." });
                    });
                }
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
            });
        });
    });
};
exports.createQBCustomer = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Company_1.Company.findById(companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
        }
        if (!company.qbAuthorized) {
            return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': constants_1.Messages.QBUnAuthorized });
        }
        if (company.qbAccessToken == undefined || company.qbAccessToken == null || company.qbRefreshToken == undefined || company.qbRefreshToken == null || company.realmId == undefined || company.realmId == null) {
            return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': constants_1.Messages.QBUnAuthorized });
        }
        var qbo = new QuickBooks(config_1.qbConfig.qb_client_id, config_1.qbConfig.qb_client_secret, company.qbAccessToken, false, // no token secret for oAuth 2.0
        company.realmId, true, // use the sandbox?
        false, // enable debugging?
        14, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        company.qbRefreshToken);
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
        };
        qbo.createCustomer(customer, function (err, data) {
            if (err != null && Object.keys(err).length != 0) {
                if (err.hasOwnProperty("fault")) {
                    if (err.fault.error[0].message.length != 0 && err.fault.error[0].message.split('; ')[2].replace('statusCode=', '') == 401) {
                        _refreshToken(req, res, company, (req, res, newCompany, error, newErrorMessage) => {
                            if (error == 0) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': newErrorMessage });
                            }
                            if (error == 400) {
                                company.updateOne({
                                    qbAuthorized: false,
                                    qbAccessToken: undefined,
                                    qbRefreshToken: undefined,
                                }, (err, raw) => {
                                    if (err) {
                                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                    }
                                    return res.json({ 'status': constants_1.Status.QBUnauthorized, 'message': "Quickbooks Authorization failed." });
                                });
                            }
                            qbo = new QuickBooks(config_1.qbConfig.qb_client_id, config_1.qbConfig.qb_client_secret, newCompany.qbAccessToken, false, // no token secret for oAuth 2.0
                            newCompany.realmId, true, // use the sandbox?
                            false, // enable debugging?
                            14, // set minorversion, or null for the latest version
                            '2.0', //oAuth version
                            newCompany.qbRefreshToken);
                            qbo.createCustomer(customer, function (newError, data) {
                                if (newError != null && Object.keys(newError).length != 0) {
                                    if (newError.hasOwnProperty("fault")) {
                                        if (newError.fault.error[0].detail.length == 0) {
                                            return res.json({ 'status': constants_1.Status.Error, 'message': newError.fault.error[0].message });
                                        }
                                        else {
                                            return res.json({ 'status': constants_1.Status.Error, 'message': newError.fault.error[0].detail });
                                        }
                                    }
                                    else if (newError.hasOwnProperty("Fault")) {
                                        return res.json({ 'status': constants_1.Status.Error, 'message': newError.Fault.Error[0].Message });
                                    }
                                }
                                else {
                                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer created successfully.' });
                                }
                            });
                        });
                    }
                    else if (err.fault.error[0].detail.length != 0) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': err.fault.error[0].message });
                    }
                    else {
                        return res.json({ 'status': constants_1.Status.Error, 'message': err.fault.error[0].detail });
                    }
                }
                else if (err.hasOwnProperty("Fault")) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': err.Fault.Error[0].Message });
                }
            }
            else {
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer created successfully.' });
            }
        });
    });
};
const get = function (obj, key) {
    return key.split(".").reduce(function (o, x) {
        return (typeof o == "undefined" || o === null) ? '' : o[x];
    }, obj);
};
exports.getQBUri = (req, res) => {
    const params = req.body;
    var oauthClient = new OAuthClient({
        clientId: config_1.qbConfig.qb_client_id,
        clientSecret: config_1.qbConfig.qb_client_secret,
        environment: config_1.qbConfig.qb_environment,
        redirectUri: config_1.qbConfig.qb_redirect_uri,
    });
    var authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting],
        state: req.companyId,
    });
    Company_1.Company.findById(req.companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (company == undefined || company == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid company id" });
        }
        company.updateOne({
            socketId: params.sessionID
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'authUri': authUri });
        });
    });
};
exports.getCallBackToken = (req, res, sio) => {
    var oauthClient = new OAuthClient({
        clientId: config_1.qbConfig.qb_client_id,
        clientSecret: config_1.qbConfig.qb_client_secret,
        environment: config_1.qbConfig.qb_environment,
        redirectUri: config_1.qbConfig.qb_redirect_uri,
    });
    oauthClient
        .createToken(req.url)
        .then(function (authResponse) {
        // var oauth2_token_json: any = JSON.stringify(authResponse.getJson(), null, 2);
        const companyId = req.query.state;
        const refresh_token = authResponse.token.refresh_token;
        const access_token = authResponse.token.access_token;
        const realmId = req.query.realmId;
        Company_1.Company.findById(companyId, (err, company) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (company == undefined || company == null) {
                return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid company id" });
            }
            var expiry = new Date();
            expiry.setDate(expiry.getDate() + 99);
            company.updateOne({
                qbAccessToken: access_token,
                qbRefreshToken: refresh_token,
                realmId: realmId,
                qbAuthorized: true,
                qbRefeshTokenExpiry: expiry
            }, (err, raw) => {
                if (err) {
                    sio.emit(company.socketId, { 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                // sio.emit("authToken", oauth2_token_json);
                sio.emit(company.socketId, { 'status': constants_1.Status.Success, 'message': 'Quickbooks Connected Successfully' });
                res.json({ 'status': 200 });
            });
        });
    })
        .catch(function (err) {
        console.error(err);
    });
};
const _refreshToken = (req, res, company, next) => {
    var oauthClient = new OAuthClient({
        clientId: config_1.qbConfig.qb_client_id,
        clientSecret: config_1.qbConfig.qb_client_secret,
        environment: config_1.qbConfig.qb_environment,
        redirectUri: config_1.qbConfig.qb_redirect_uri,
    });
    oauthClient
        .refreshUsingToken(company.qbRefreshToken)
        .then(function (authResponse) {
        const refresh_token = authResponse.token.refresh_token;
        const access_token = authResponse.token.access_token;
        var expiry = new Date();
        expiry.setDate(expiry.getDate() + 99);
        company.updateOne({
            qbAccessToken: access_token,
            qbRefreshToken: refresh_token,
            qbAuthorized: true,
            qbRefeshTokenExpiry: expiry
        }, (err, raw) => {
            if (err) {
                next(req, res, null, 0, constants_1.Messages.GenericError);
                return;
            }
            Company_1.Company.findById(company._id, (err, newCompany) => {
                if (err) {
                    next(req, res, null, 0, constants_1.Messages.GenericError);
                    return;
                }
                next(req, res, newCompany, 1, '');
                return;
            });
        });
    })
        .catch(function (err) {
        next(req, res, null, err.authResponse.response.status, 'Unable to refersh the token');
        return;
    });
};
const _getCustomers = (req, res, company, next) => {
    var qbo = new QuickBooks(config_1.qbConfig.qb_client_id, config_1.qbConfig.qb_client_secret, company.qbAccessToken, false, // no token secret for oAuth 2.0
    company.realmId, true, // use the sandbox?
    false, // enable debugging?
    14, // set minorversion, or null for the latest version
    '2.0', //oAuth version
    company.qbRefreshToken);
    qbo.findCustomers([{ field: 'fetchAll', value: true }], function (qbError, customers) {
        var errorMessage;
        if (qbError != null && Object.keys(qbError).length != 0) {
            if (qbError.hasOwnProperty("fault")) {
                if (qbError.fault.error[0].message.length != 0 && qbError.fault.error[0].message.split('; ')[2].replace('statusCode=', '') == 401) {
                    _refreshToken(req, res, company, (req, res, newCompany, error, newErrorMessage) => {
                        if (error == 0) {
                            next(req, res, error, newErrorMessage, []);
                            return;
                        }
                        if (error == 400) {
                            next(req, res, error, newErrorMessage, []);
                            return;
                        }
                        qbo = new QuickBooks(config_1.qbConfig.qb_client_id, config_1.qbConfig.qb_client_secret, newCompany.qbAccessToken, false, // no token secret for oAuth 2.0
                        newCompany.realmId, true, // use the sandbox?
                        false, // enable debugging?
                        14, // set minorversion, or null for the latest version
                        '2.0', //oAuth version
                        newCompany.qbRefreshToken);
                        qbo.findCustomers([{ field: 'fetchAll', value: true }], function (qbErrorNew, customers2) {
                            if (qbErrorNew != null && Object.keys(qbErrorNew).length != 0) {
                                if (qbErrorNew.hasOwnProperty("fault")) {
                                    if (qbErrorNew.fault.error[0].detail.length != 0) {
                                        errorMessage = qbErrorNew.fault.error[0].message;
                                    }
                                    else {
                                        errorMessage = qbErrorNew.fault.error[0].detail;
                                    }
                                    next(req, res, 0, errorMessage, []);
                                    return;
                                }
                                else if (qbErrorNew.hasOwnProperty("Fault")) {
                                    errorMessage = qbErrorNew.Fault.Error[0].Message;
                                    next(req, res, 0, errorMessage, []);
                                    return;
                                }
                            }
                            else {
                                next(req, res, 1, '', customers2);
                                return;
                            }
                        });
                    });
                }
                else if (qbError.fault.error[0].detail.length != 0) {
                    errorMessage = qbError.fault.error[0].message;
                    next(req, res, 0, errorMessage, []);
                    return;
                }
                else {
                    errorMessage = qbError.fault.error[0].detail;
                    next(req, res, 0, errorMessage, []);
                    return;
                }
            }
            else if (qbError.hasOwnProperty("Fault")) {
                errorMessage = qbError.Fault.Error[0].Message;
                next(req, res, 0, errorMessage, []);
                return;
            }
        }
        else {
            next(req, res, 1, '', customers);
            return;
        }
    });
};
//# sourceMappingURL=quickbook.js.map