"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Customer_1 = require("../models/Customer");
const Subscriber_1 = require("../models/Subscriber");
exports.createCustomer = (req, res) => {
    const params = req.body;
    const subscriber = req.user;
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
        subscriber: subscriber._id
    });
    customer.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        subscriber.customers.push(customer._id);
        subscriber.update({ customers: subscriber.customers }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer created successfully.' });
        });
    });
};
exports.getCustomers = (req, res) => {
    const params = req.body;
    const user = req.user;
    var subscriberId;
    if (user.subscriber) {
        subscriberId = user.subscriber;
    }
    else {
        subscriberId = user._id;
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
    Subscriber_1.Subscriber.findOne({ _id: subscriberId })
        .populate({
        path: 'customers',
        match: filter,
    })
        .exec((err, subscriber) => {
        if (err || !subscriber) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'customers': subscriber.customers });
    });
};
//# sourceMappingURL=customer.js.map