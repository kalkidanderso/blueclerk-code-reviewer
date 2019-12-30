"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Customer_1 = require("../models/Customer");
const Company_1 = require("../models/Company");
exports.createCustomer = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    const customer = new Customer_1.Customer({
        info: {
            name: params.name,
            email: params.email,
        },
        address: {
            street: params.street,
            city: params.city,
            state: params.state,
            zipCode: params.zipCode,
        },
        contact: {
            name: params.contactName,
            phone: params.phone,
        },
        company: companyId
    });
    customer.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        Company_1.Company.findById(req.companyId, function (err, company) {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            company.customers.push(customer._id);
            company.updateOne({ customers: company.customers }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer created successfully.' });
            });
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
    Company_1.Company.findOne({ _id: companyId })
        .populate({
        path: 'customers',
        match: filter,
    })
        .exec((err, company) => {
        if (err || !company) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'customers': company.customers });
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
            'info.name': params.name,
            'info.email': params.email,
            'address.street': params.street,
            'address.city': params.city,
            'address.state': params.state,
            'address.zipCode': params.zipCode,
            'contact.name': params.contactName,
            'contact.phone': params.phone,
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer data updated successfully.' });
        });
    });
};
//# sourceMappingURL=customer.js.map