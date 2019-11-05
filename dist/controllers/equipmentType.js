"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const EquipmentType_1 = require("../models/EquipmentType");
const Company_1 = require("../models/Company");
exports.createEquipmentType = (req, res) => {
    const params = req.body;
    const user = req.user;
    var userId = null;
    var industryId = null;
    if (user.permissions.role == 3 /* COMPANY */) {
        userId = user._id;
    }
    if (user.permissions.role != 4 /* GLOBAL_ADMIN */) {
        userId = req.companyId;
    }
    if (user.permissions.role == 4 /* GLOBAL_ADMIN */) {
        if (params.industryId == undefined || params.industryId == null) {
            return res.json({ status: constants_1.Status.Error, message: "Industry Id is required" });
        }
        else {
            industryId = params.industryId;
        }
    }
    const type = new EquipmentType_1.EquipmentType({
        title: params.title,
        industry: industryId,
        createdBy: userId
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
    if (user.permissions.role == 4 /* GLOBAL_ADMIN */) {
        EquipmentType_1.EquipmentType.find({ $or: [{ createdBy: null }, { createdBy: req.companyId }] }, (err, types) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            res.json({ 'status': constants_1.Status.Success, 'types': types });
        });
    }
    else {
        Company_1.Company.findById(req.companyId, (err, company) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            EquipmentType_1.EquipmentType.find({ $or: [{ createdBy: req.companyId },
                    { $and: [{ industry: company.info.industry }, { createdBy: null },] }
                ] }, (err, types) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                res.json({ 'status': constants_1.Status.Success, 'types': types });
            });
        });
    }
};
//# sourceMappingURL=equipmentType.js.map