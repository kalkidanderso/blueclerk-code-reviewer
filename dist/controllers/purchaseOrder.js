"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const PurchaseOrder_1 = require("../models/PurchaseOrder");
const Estimate_1 = require("../models/Estimate");
exports.createPO = (req, res) => {
    const params = req.body;
    const user = req.user;
    var items = [];
    if (params.items != undefined) {
        items = JSON.parse(params.items);
    }
    let POItems = [];
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
            }
            POItems.push(obj);
        }
    }
    const purchaseOrder = new PurchaseOrder_1.PurchaseOrder({
        items: POItems,
        note: params.note,
        total: params.total,
        job: params.job,
        customer: params.customer,
        company: req.companyId,
        createdBy: user._id,
        createdAt: Date.now()
    });
    purchaseOrder.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Purchase order created successfully.' });
    });
};
exports.createPOEstimate = (req, res) => {
    const params = req.body;
    const user = req.user;
    PurchaseOrder_1.PurchaseOrder.findOne({ 'estimate': params.estimateId, 'company': req.companyId })
        .exec((err, estimate) => {
        if (estimate != undefined || estimate != null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Purchase Order already created for this estimate' });
        }
        Estimate_1.Estimate.findOne({ _id: params.estimateId })
            .exec((err, estimate) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (estimate == undefined || estimate == null) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid estimate id' });
            }
            if (estimate.status == 0) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'You can\'t create purchase order from pending estimate. It should be approved.' });
            }
            if (estimate.status == 2) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'you can\'t create purchase order from canceled estimate. It should be appproved' });
            }
            var items = estimate.items;
            if (items.length < 1 && estimate.note == undefined && estimate.note == '""') {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'This estimate must have some items or note to create purchase order from estimate' });
            }
            let POItems = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
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
                    obj.cost = item.cost;
                    obj.price = item.price;
                }
                POItems.push(obj);
            }
            const purchaseOrder = new PurchaseOrder_1.PurchaseOrder({
                items: POItems,
                total: estimate.total,
                note: estimate.note,
                estimate: estimate._id,
                customer: estimate.customer,
                company: req.companyId,
                createdBy: user._id,
                createdAt: Date.now()
            });
            purchaseOrder.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Purchase order created successfully.' });
            });
        });
    });
};
exports.getAllPO = (req, res) => {
    PurchaseOrder_1.PurchaseOrder.find({ company: req.companyId })
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
        select: 'name itemCode description cost price'
    })
        .populate({
        path: 'estimate',
        select: 'total note'
    })
        .exec((err, purchaseOrders) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'purchaseOrders': purchaseOrders });
    });
};
exports.updatePOStatus = (req, res) => {
    const params = req.body;
    PurchaseOrder_1.PurchaseOrder.findOne({ company: req.companyId, _id: params.purchaseOrderId })
        .exec((err, purchaseOrder) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (purchaseOrder == undefined || purchaseOrder == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid purchase order id.' });
        }
        if (params.status != 1 /* APPROVED */ && params.status != 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid purchase order status.' });
        }
        if (purchaseOrder.status == 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Purchase orde already canceled" });
        }
        purchaseOrder.updateOne({ status: params.status }, (err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Purchase order status updated successfully.' });
        });
    });
};
exports.updatePO = (req, res) => {
    const params = req.body;
    const user = req.user;
    PurchaseOrder_1.PurchaseOrder.findOne({ '_id': params.purchaseOrderId, 'company': req.companyId }, (err, purchaseOrder) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (purchaseOrder == undefined || purchaseOrder == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid purchase order id.' });
        }
        if (purchaseOrder.status == 1 /* APPROVED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "You can\'t change approved purchase order." });
        }
        if (purchaseOrder.status == 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "You can\'t change canceled purchase order." });
        }
        var items;
        if (params.items == undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Items are required' });
        }
        try {
            items = JSON.parse(params.items);
        }
        catch (error) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Items json is invalid' });
        }
        let POItems = [];
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
                obj.cost = item.cost;
                obj.price = item.price;
                obj.quantity = item.quantity;
            }
            POItems.push(obj);
        }
        purchaseOrder.update({ items: POItems, total: params.total, job: params.job, note: params.note }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Purchase Order updated successfully." });
        });
    });
};
//# sourceMappingURL=purchaseOrder.js.map