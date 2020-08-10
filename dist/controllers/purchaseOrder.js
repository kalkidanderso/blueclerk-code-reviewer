"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const PurchaseOrder_1 = require("../models/PurchaseOrder");
const Estimate_1 = require("../models/Estimate");
exports.createPO = (req, res) => {
    const params = req.body;
    const user = req.user;
    const company = req.company;
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
            obj.cost = item.cost;
            obj.price = item.price;
            obj.quantity = item.quantity;
            obj.taxPercentage = item.taxPercentage;
            obj.tax = item.tax;
            if (item.part == undefined || item.part == null) {
                obj.name = item.name;
                obj.itemCode = item.itemCode;
            }
            else {
                obj.part = item.part;
            }
            POItems.push(obj);
        }
    }
    // let taxAmount = 0;
    // let total = params.total;
    // if(params.tax != undefined && params.tax != null) {
    //     if(params.tax > 0) {
    //         taxAmount = total * (params.tax / 100)
    //         total = parseInt(total) + taxAmount
    //     }    
    // }
    let POId = 1;
    if (company.currentPOId) {
        POId = company.currentPOId + 1;
    }
    const purchaseOrder = new PurchaseOrder_1.PurchaseOrder({
        purchaseOrderId: 'Purchase Order ' + POId,
        items: POItems,
        note: params.note,
        total: params.total,
        job: params.job,
        customer: params.customer,
        company: req.companyId,
        createdBy: user._id,
        createdAt: Date.now(),
    });
    if (params.equipmentId != undefined && params.equipmentId != null) {
        purchaseOrder.equipment = params.equipmentId;
    }
    purchaseOrder.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        company.updateOne({ currentPOId: POId }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Purchase order created successfully.' });
        });
    });
};
exports.createPOEstimate = (req, res) => {
    const params = req.body;
    const user = req.user;
    const company = req.company;
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
            // if(estimate.status == EstimateStatus.PENDING){
            //     return res.json({ 'status': Status.Error, 'message': 'You can\'t create purchase order from pending estimate. It should be approved.' })
            // }
            if (estimate.status == 2 /* CANCELED */) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'you can\'t create purchase order from canceled estimate.' });
            }
            var items = estimate.items;
            if (items.length < 1 && estimate.note == undefined && estimate.note == '""') {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'This estimate must have some items or note to create purchase order from estimate' });
            }
            let POItems = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                let obj = {};
                obj.cost = item.cost;
                obj.price = item.price;
                obj.quantity = item.quantity;
                obj.taxPercentage = item.taxPercentage;
                obj.tax = item.tax;
                if (item.part == undefined || item.part == null) {
                    obj.name = item.name;
                    obj.itemCode = item.itemCode;
                }
                else {
                    obj.part = item.part;
                }
                POItems.push(obj);
            }
            let POId = company.currentPOId + 1;
            const purchaseOrder = new PurchaseOrder_1.PurchaseOrder({
                purchaseOrderId: 'Purchase Order ' + POId,
                items: POItems,
                total: estimate.total,
                note: estimate.note,
                estimate: estimate._id,
                customer: estimate.customer,
                company: req.companyId,
                createdBy: user._id,
                createdAt: Date.now(),
            });
            purchaseOrder.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                company.updateOne({ currentPOId: POId }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Purchase order created successfully.' });
                });
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
        .populate({
        path: 'equipment',
        select: 'info.model info.serialNumber info.location images'
    })
        .exec((err, purchaseOrders) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'purchaseOrders': purchaseOrders });
    });
};
exports.getAllEquipmentPurchaseOrder = (req, res) => {
    const params = req.body;
    PurchaseOrder_1.PurchaseOrder.find({ company: req.companyId, equipment: params.equipmentId })
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
        .populate({
        path: 'equipment',
        select: 'info.model info.serialNumber info.location images'
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
        // if (params.status != PurchaseOrderStatus.APPROVED && params.status != PurchaseOrderStatus.CANCELED) {
        //     return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order status.' })
        // }
        // if (purchaseOrder.status == PurchaseOrderStatus.CANCELED) {
        //     return res.json({ 'status': Status.Error, 'message': "Purchase orde already canceled" })
        // }
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
        // if (purchaseOrder.status == PurchaseOrderStatus.APPROVED) {
        //     return res.json({ 'status': Status.Error, 'message': "You can\'t change approved purchase order." })
        // }
        // if (purchaseOrder.status == PurchaseOrderStatus.CANCELED) {
        //     return res.json({ 'status': Status.Error, 'message': "You can\'t change canceled purchase order." })
        // }
        var items;
        let POItems = [];
        if (params.items != undefined) {
            try {
                items = JSON.parse(params.items);
            }
            catch (error) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Items json is invalid' });
            }
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if ((!item.hasOwnProperty('part') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'items format is invalid' });
                }
                let obj = {};
                obj.cost = item.cost;
                obj.price = item.price;
                obj.quantity = item.quantity;
                obj.tax = item.tax;
                obj.taxPercentage = item.taxPercentage;
                if (item.part == undefined || item.part == null) {
                    obj.name = item.name;
                    obj.itemCode = item.itemCode;
                }
                else {
                    obj.part = item.part;
                }
                POItems.push(obj);
            }
        }
        if (params.equipmentId != undefined && params.equipmentId != null) {
            purchaseOrder.update({ items: POItems, job: params.job, total: params.total, note: params.note, equipment: params.equipmentId }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': "Purchase Order updated successfully." });
            });
        }
        else {
            purchaseOrder.update({ items: POItems, total: params.total, job: params.job, note: params.note }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': "Purchase Order updated successfully." });
            });
        }
    });
};
//# sourceMappingURL=purchaseOrder.js.map