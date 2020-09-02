"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Invoice_1 = require("../models/Invoice");
const Payment_1 = require("../models/Payment");
const Customer_1 = require("../models/Customer");
exports.createPayment = (req, res) => {
    const params = req.body;
    const user = req.user;
    let invoicesPaid = [];
    if (params.invoices != undefined) {
        invoicesPaid = params.invoices.split(',');
    }
    const payment = new Payment_1.Payment({
        customer: params.customer,
        amountPaid: params.amount,
        referenceNumber: params.referenceNumber,
        paymentType: params.paymentType,
        paidAt: params.paidAt,
        company: req.companyId,
        createdBy: user._id,
        invoices: invoicesPaid,
        createdAt: Date.now(),
    });
    payment.save()
        .then((payment) => {
        if (payment == undefined || payment == null) {
            throw new Error();
        }
        else {
            return new Promise((resolve, reject) => {
                Customer_1.Customer.findById(params.customer)
                    .then((customer) => {
                    let remainingBalance = customer.balance - payment.amountPaid;
                    customer.updateOne({ balance: remainingBalance })
                        .then((res) => {
                        resolve();
                    })
                        .catch((err) => {
                        reject();
                    });
                })
                    .catch((err) => {
                    reject();
                });
            });
        }
    })
        .then((res) => {
        return Invoice_1.Invoice.update({ _id: { $in: invoicesPaid } }, { paid: true });
    })
        .then((response) => {
        return res.json({ 'status': constants_1.Status.Success, 'message': "Payment created successfully." });
    })
        .catch((error) => {
        if (error.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': error.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
    });
};
exports.udpatePayment = (req, res) => {
    const params = req.body;
    const user = req.user;
    let previousDedeuctedBalance = 0;
    let invoicesPaid = [];
    if (params.invoices != undefined) {
        invoicesPaid = params.invoices.split(',');
    }
    Payment_1.Payment.findById(params.paymentId)
        .then((payment) => {
        if (payment == undefined || payment == null) {
            throw new Error('Invalid payment Id.');
        }
        else {
            return new Promise((resolve, reject) => {
                previousDedeuctedBalance = payment.amountPaid;
                payment.updateOne({ amountPaid: params.amount, referenceNumber: params.referenceNumber, paymentType: params.paymentType, paidAt: params.paidAt, invoices: invoicesPaid, udpatedBy: user._id, udpatedAt: Date.now() })
                    .then((res) => {
                    resolve();
                })
                    .catch((err) => {
                    reject();
                });
            });
        }
    })
        .then((response) => {
        return new Promise((resolve, reject) => {
            Customer_1.Customer.findById(params.customer)
                .then((customer) => {
                let newBalance = customer.balance + previousDedeuctedBalance;
                newBalance = newBalance - params.amount;
                customer.updateOne({ balance: newBalance })
                    .then((res) => {
                    resolve();
                })
                    .catch((err) => {
                    reject();
                });
            })
                .catch((err) => {
                reject();
            });
        });
    })
        .then((res) => {
        return new Promise((resolve, reject) => {
            if (params.invoices != undefined && params.invoices != null && params.invoices) {
                Invoice_1.Invoice.update({ _id: { $in: invoicesPaid } }, { paid: true })
                    .then((res) => {
                    resolve();
                })
                    .catch((err) => {
                    reject();
                });
            }
            else {
                resolve();
            }
        });
    })
        .then((response) => {
        return res.json({ 'status': constants_1.Status.Success, 'message': "Payment update successfully." });
    })
        .catch((error) => {
        if (error.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': error.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
    });
};
exports.getPayments = (req, res) => {
    Payment_1.Payment.find({ company: req.companyId })
        .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
    })
        .populate({
        path: 'invoices'
    })
        .then((payments) => {
        return res.json({ 'status': constants_1.Status.Success, 'payment': payments });
    })
        .catch((error) => {
        if (error.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': error.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
    });
};
exports.getPaymentsByCustomerId = (req, res) => {
    const params = req.body;
    Payment_1.Payment.find({ customer: params.customer })
        .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
    })
        .populate({
        path: 'invoices'
    })
        .then((payments) => {
        return res.json({ 'status': constants_1.Status.Success, 'payment': payments });
    })
        .catch((error) => {
        if (error.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': error.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
    });
};
//# sourceMappingURL=payemnt.js.map