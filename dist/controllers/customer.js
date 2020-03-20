"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Customer_1 = require("../models/Customer");
const CompanyCustomer_1 = require("../models/CompanyCustomer");
const User_1 = require("../models/User");
exports.createCustomer = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    const customer = new Customer_1.Customer({
        info: {
            email: params.email,
        },
        profile: {
            firstName: params.name,
            lastName: params.name,
            displayName: params.name,
            imageUrl: '',
        },
        address: {
            street: params.street,
            city: params.city,
            state: params.state,
            zipCode: params.zipCode,
        },
        contact: {
            phone: params.phone,
        },
        company: companyId,
        permissions: {
            role: 5 /* CUSTOMER */,
            extra: [],
        },
    });
    customer.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        // create company customer here
        const companyCustomer = new CompanyCustomer_1.CompanyCustomer({
            company: companyId,
            customer: customer._id,
            createdAt: Date.now()
        });
        companyCustomer.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer created successfully.' });
        });
    });
};
exports.getCustomers = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    var filter;
    if (params.includeActive == 'true' && params.includeNonActive == 'true') {
        filter = {};
    }
    else if (params.includeActive == 'true') {
        filter = { 'isActive': { $eq: true } };
    }
    else {
        filter = { 'isActive': { $eq: false } };
    }
    var companyId = companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    CompanyCustomer_1.CompanyCustomer.find({ company: companyId }, (err, companyCustomers) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (companyCustomers.length == 0) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No customer found.' });
        }
        const customerIds = companyCustomers.map((obj) => {
            return obj.customer;
        });
        User_1.User.find({ _id: { $in: customerIds } }, 'info.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.zipCode contact.phone permissions.role', (err, users) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'customers': users });
        });
    });
};
exports.updateCustomer = (req, res) => {
    const params = req.body;
    Customer_1.Customer.findById(params.customerId)
        .exec((err, customer) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        customer.updateOne({
            'info.email': params.email,
            'profile.firstName': params.name,
            'profile.lastName': params.name,
            'profile.displayName': params.name,
            'address.street': params.street,
            'address.city': params.city,
            'address.state': params.state,
            'address.zipCode': params.zipCode,
            'contact.phone': params.phone,
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer updated successfully.' });
        });
    });
};
exports.customerDetail = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    CompanyCustomer_1.CompanyCustomer.findOne({ 'customer': params.customerId, company: companyId })
        .populate({
        path: 'customer'
    })
        .exec((err, companyCustomer) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (companyCustomer == undefined || companyCustomer == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No customer found' });
        }
        const customer = companyCustomer.customer;
        if (customer.permissions.role == 5 /* CUSTOMER */) {
            customer.populate('equipments', function (err) {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'customer': customer });
            });
        }
    });
};
//# sourceMappingURL=customer.js.map