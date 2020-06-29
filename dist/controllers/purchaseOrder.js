"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const PurchaseOrder_1 = require("../models/PurchaseOrder");
exports.createPO = (req, res) => {
    const params = req.body;
    const user = req.user;
    var items = JSON.parse(params.items);
    if (items.length == 0) {
        return res.json({ 'status': constants_1.Status.Error, 'message': 'items are required' });
    }
    let POItems = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.hasOwnProperty('part') && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price'))) {
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
    const purchaseOrder = new PurchaseOrder_1.PurchaseOrder({
        items: POItems,
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
        var items = JSON.parse(params.items);
        if (items.length == 0) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'items are required' });
        }
        let POItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.hasOwnProperty('part') && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price'))) {
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
        purchaseOrder.update({ items: POItems, total: params.total, customer: params.customer, job: params.job }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Purchase Order updated successfully." });
        });
    });
};
//# sourceMappingURL=purchaseOrder.js.map