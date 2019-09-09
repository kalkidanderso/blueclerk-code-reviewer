"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const EquipmentBrand_1 = require("../models/EquipmentBrand");
exports.createEquipmentBrand = (req, res) => {
    const params = req.body;
    const user = req.user;
    const brand = new EquipmentBrand_1.EquipmentBrand({
        title: params.title,
        createdBy: user.permissions.role == 3 /* SUBSCRIBER */ ? user._id : null
    });
    brand.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Equipment brand created successfully.' });
    });
};
exports.getEquipmentBrands = (req, res) => {
    const user = req.user;
    const nonSubscriber = user;
    var createdBy;
    if (nonSubscriber.subscriber) {
        createdBy = nonSubscriber.subscriber;
    }
    else {
        createdBy = user._id;
    }
    EquipmentBrand_1.EquipmentBrand.find({ $or: [{ createdBy: null }, { createdBy: createdBy }] }, (err, brands) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'brands': brands });
    });
};
//# sourceMappingURL=equipmentBrand.js.map