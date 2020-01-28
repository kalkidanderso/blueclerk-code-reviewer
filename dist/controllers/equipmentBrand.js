"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const EquipmentBrand_1 = require("../models/EquipmentBrand");
const Company_1 = require("../models/Company");
exports.createEquipmentBrand = (req, res) => {
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
    EquipmentBrand_1.EquipmentBrand.findOne({ title: params.title }, (err, previousEquipmentBrand) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (previousEquipmentBrand != undefined || previousEquipmentBrand != null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Equipment Brand already created" });
        }
        const brand = new EquipmentBrand_1.EquipmentBrand({
            title: params.title,
            industry: industryId,
            createdBy: userId
        });
        brand.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Equipment brand created successfully.' });
        });
    });
};
exports.getEquipmentBrands = (req, res) => {
    const user = req.user;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    if (user.permissions.role == 4 /* GLOBAL_ADMIN */) {
        EquipmentBrand_1.EquipmentBrand.find({ $or: [{ createdBy: null }, { createdBy: companyId }] }, (err, brands) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            res.json({ 'status': constants_1.Status.Success, 'brands': brands });
        });
    }
    else {
        Company_1.Company.findById(companyId, (err, company) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            EquipmentBrand_1.EquipmentBrand.find({ $or: [{ createdBy: companyId },
                    { $and: [{ industry: company.info.industry }, { createdBy: null },] }
                ] }, (err, brands) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                res.json({ 'status': constants_1.Status.Success, 'brands': brands });
            });
        });
    }
};
//# sourceMappingURL=equipmentBrand.js.map