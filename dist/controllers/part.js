"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Part_1 = require("../models/Part");
exports.createPartInventory = (req, res) => {
    const params = req.body;
    const user = req.user;
    Part_1.Part.findOne({ company: req.companyId, itemCode: params.itemCode }, (err, part) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (part != undefined || part != null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Part aleady exist with itemCode ' + params.itemCode });
        }
        const newPart = new Part_1.Part({
            name: params.name,
            description: params.description,
            itemCode: params.itemCode,
            totalQuantity: params.totalQuantity,
            availableQuantity: params.totalQuantity,
            cost: params.cost,
            price: params.price,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now()
        });
        newPart.save((err2) => {
            if (err2) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Part inventory created successfully.' });
        });
    });
};
exports.getPartInventory = (req, res) => {
    Part_1.Part.find({ company: req.companyId })
        .exec((err, parts) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'parts': parts });
    });
};
exports.removePartInventory = (req, res) => {
    const params = req.body;
    Part_1.Part.findOne({ _id: params.partId, company: req.companyId })
        .exec((err, part) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (part == undefined || part == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid part inventory id.' });
        }
        Part_1.Part.deleteOne({ _id: part._id }, (err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Part Inventory removed successfully.' });
        });
    });
};
exports.updatePartInventory = (req, res) => {
    const params = req.body;
    Part_1.Part.findOne({ _id: params.partId, company: req.companyId })
        .exec((err, part) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (part == undefined || part == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid part inventory id.' });
        }
        part.name = params.name;
        part.description = params.description;
        part.cost = params.cost;
        part.price = params.price;
        part.itemCode = params.itemCode;
        part.totalQuantity = params.totalQuantity;
        part.availableQuantity = params.availableQuantity;
        part.updateOne(part, (err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Part inventory updated successfully.' });
        });
    });
};
//# sourceMappingURL=part.js.map