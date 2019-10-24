"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const EquipmentBrand_1 = require("../models/EquipmentBrand");
exports.createEquipmentBrand = (req, res) => {
    const params = req.body;
    const user = req.user;
    var userId = null;
    if (user.permissions.role == 3 /* COMPANY */) {
        userId = user._id;
    }
    if (user.permissions.role != 4 /* GLOBAL_ADMIN */) {
        userId = req.companyId;
    }
    const brand = new EquipmentBrand_1.EquipmentBrand({
        title: params.title,
        createdBy: userId
    });
    brand.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Equipment brand created successfully.' });
    });
};
exports.getEquipmentBrands = (req, res) => {
    EquipmentBrand_1.EquipmentBrand.find({ $or: [{ createdBy: null }, { createdBy: req.companyId }] }, (err, brands) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'brands': brands });
    });
};
//# sourceMappingURL=equipmentBrand.js.map