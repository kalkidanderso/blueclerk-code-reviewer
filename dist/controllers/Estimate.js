"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Estimate_1 = require("../models/Estimate");
exports.createEstimate = (req, res) => {
    const params = req.body;
    const user = req.user;
    var items = [];
    if (params.items != undefined) {
        items = JSON.parse(params.items);
    }
    let estimateItems = [];
    if (items.length > 0) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if ((!item.hasOwnProperty('part') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'items format is invalid' });
            }
            let obj = {};
            if (item.part == undefined || item.part == null) {
                obj.name = item.name;
                obj.itemCode = item.itemCode;
                obj.cost = item.cost;
                obj.price = item.price;
                obj.quantity = item.quantity;
            }
            else {
                obj.part = item.part;
                obj.quantity = item.quantity;
                obj.itemCode = item.itemCode;
                obj.cost = item.cost;
                obj.price = item.price;
            }
            estimateItems.push(obj);
        }
    }
    const estimate = new Estimate_1.Estimate({
        note: params.note,
        items: estimateItems,
        total: params.total,
        customer: params.customer,
        company: req.companyId,
        createdBy: user._id,
        createdAt: Date.now()
    });
    estimate.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Estimate created successfully.' });
    });
};
exports.getEstimates = (req, res) => {
    let where = {};
    const params = req.body;
    where.company = req.companyId;
    if (params.customer != undefined || params.customer != null) {
        where.customer = params.customer;
    }
    Estimate_1.Estimate.find(where)
        .populate({
        path: 'customer',
        select: 'profile.displayName info.email'
    })
        .populate({
        path: 'createdBy',
        select: 'info.companyName auth.email profile.displayName'
    })
        .populate({
        path: 'items.part',
        select: 'name itemCode note cost price'
    })
        .exec((err, estimates) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'estimates': estimates });
    });
};
exports.updateEstimateStatus = (req, res) => {
    const params = req.body;
    Estimate_1.Estimate.findOne({ company: req.companyId, _id: params.estimateId })
        .exec((err, estimate) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (estimate == undefined || estimate == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid Estimate id.' });
        }
        if (params.status != 1 /* APPROVED */ && params.status != 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid estimate status.' });
        }
        if (estimate.status == 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Estimate already canceled" });
        }
        estimate.updateOne({ status: params.status }, (err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Estimate status updated successfully.' });
        });
    });
};
exports.updateEstimate = (req, res) => {
    const params = req.body;
    const user = req.user;
    Estimate_1.Estimate.findOne({ '_id': params.estimateId, 'company': req.companyId }, (err, estimate) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (estimate == undefined || estimate == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid Estimate id.' });
        }
        if (estimate.status == 1 /* APPROVED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "You can\'t change approved Estimate." });
        }
        if (estimate.status == 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "You can\'t change canceled Estimate." });
        }
        let estimateItems = [];
        var items = [];
        if (params.items != undefined) {
            items = JSON.parse(params.items);
        }
        if (items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if ((!item.hasOwnProperty('part') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'items format is invalid' });
                }
                let obj = {};
                if (item.part == undefined || item.part == null) {
                    obj.name = item.name;
                    obj.itemCode = item.itemCode;
                    obj.cost = item.cost;
                    obj.price = item.price;
                    obj.quantity = item.quantity;
                }
                else {
                    obj.part = item.part;
                    obj.quantity = item.quantity;
                    obj.itemCode = item.itemCode;
                    obj.cost = item.cost;
                    obj.price = item.price;
                }
                estimateItems.push(obj);
            }
        }
        estimate.update({ items: estimateItems, total: params.total, customer: params.customer, note: params.note }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': err });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Estimate updated successfully." });
        });
    });
};
exports.removeEstimate = (req, res) => {
    const params = req.body;
    Estimate_1.Estimate.findOne({ _id: params.estimateId, company: req.companyId })
        .exec((err, estimate) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (estimate == undefined || estimate == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid Estimate id.' });
        }
        if (estimate.status == 1 /* APPROVED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'You can\'t delete approved estimate.' });
        }
        if (estimate.status == 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'You can\'t delete canceled estimate.' });
        }
        Estimate_1.Estimate.findOneAndDelete({ _id: params.estimateId })
            .exec((err, estimate) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Estimate removed successfully.' });
        });
    });
};
//# sourceMappingURL=Estimate.js.map