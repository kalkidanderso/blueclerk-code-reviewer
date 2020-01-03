"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Order_1 = require("../models/Order");
const stripe_1 = require("../services/stripe");
const CompanyCard_1 = require("../models/CompanyCard");
const mongodb_1 = require("mongodb");
exports.placeOrder = (req, res) => {
    const params = req.body;
    const company = req.company;
    if (company.stripeId == undefined || company.stripeId == "") {
        return res.json({ status: constants_1.Status.Error, message: "Company payment method required." });
    }
    CompanyCard_1.CompanyCard.findById(params.cardId, (err, card) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        stripe_1.chargeCustomer(params.total, company.stripeId, card.cardStripeId, (status, charge, message) => {
            if (status == 1) {
                const order = new Order_1.Order({
                    info: {
                        noOfTags: params.noOfTags,
                        total: params.total,
                        tax: params.tax,
                        Status: 0 /* PLACED */
                    },
                    address: {
                        street: params.street,
                        city: params.city,
                        state: params.state,
                        zipCode: params.zipCode
                    },
                    company: req.companyId,
                    stripeChargeId: charge.id,
                });
                order.save((err) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    // charge the amount to company
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Order placed successfully.' });
                });
                // return res.json({status: Status.Success, message: "Order placed successfully."});
            }
            else {
                return res.json({ status: constants_1.Status.Error, message: message });
            }
        });
    });
};
exports.getOrders = (req, res) => {
    Order_1.Order.find({ company: new mongodb_1.ObjectId(req.companyId) }, '_id info.noOfTags info.total info.tax info.status', (err, orders) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'orders': orders });
    });
};
//# sourceMappingURL=order.js.map