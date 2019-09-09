"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const EquipmentType_1 = require("../models/EquipmentType");
exports.createEquipmentType = (req, res) => {
    const params = req.body;
    const user = req.user;
    const type = new EquipmentType_1.EquipmentType({
        title: params.title,
        createdBy: user.permissions.role == 3 /* SUBSCRIBER */ ? user._id : null
    });
    type.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Equipment type created successfully.' });
    });
};
exports.getEquipmentTypes = (req, res) => {
    const user = req.user;
    const nonSubscriber = user;
    var createdBy;
    if (nonSubscriber.subscriber) {
        createdBy = nonSubscriber.subscriber;
    }
    else {
        createdBy = user._id;
    }
    EquipmentType_1.EquipmentType.find({ $or: [{ createdBy: null }, { createdBy: createdBy }] }, (err, types) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'types': types });
    });
};
//# sourceMappingURL=equipmentType.js.map