"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Order_1 = require("../models/Order");
const config_1 = require("../common/config");
exports.createCustomer = (req, res) => {
    const stripe = require("stripe")(config_1.stripeConfig.sk_secret);
    stripe.customers.create({
        email: 'testuser@demo.com',
        description: 'Customer for testuser@demo.com',
        source: "tok_visa" // obtained with Stripe.js
    }, function (err, customer) {
        // asynchronously called
        if (err) {
            console.log('error' + err);
        }
        console.log(customer);
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Stripe customer created successfully.' });
    });
    // const params = req.body
    // var stripeUser= {}
    // stripe.customers
    // .create({
    //     email: 'foo-customer@example.com',
    // })
    // .then((customer) => {
    //     stripeUser = customer
    //     return stripe.customers.createSource(customer.id, {
    //     source: 'tok_visa',
    //     });
    // })
    // .then((source) => {
    //     return stripe.charges.create({
    //     amount: 1600,
    //     currency: 'usd',
    //     customer: source.customer,
    //     });
    // })
    // .then((charge) => {
    //     // New charge created on a new customer
    // })
    // .catch((err) => {
    //     // Deal with an error
    // });
};
exports.placeOrder = (req, res) => {
    const params = req.body;
    const order = new Order_1.Order({
        info: {
            dateTime: params.dateTime,
            noOfTags: params.noOfTags,
            total: params.total,
            tax: params.tax,
            Status: 0 /* PLACED */
        },
        address: {
            street: params.street,
            city: params.city,
            status: params.state,
            zipCode: params.zipCode
        },
        company: req.companyId,
    });
    order.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Order placed successfully.' });
    });
};
exports.getOrders = (req, res) => {
    Order_1.Order.find({ company: req.companyId }, (err, orders) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'orders': orders });
    });
};
exports.updateOrder = (req, res) => {
    const params = req.body;
    Order_1.Order.findOne({ _id: params.orderId, company: req.companyId }, (err, order) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        order.updateOne({ status: params.orderStatus }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Order updated successfully.' });
        });
    });
};
//# sourceMappingURL=order.js.map