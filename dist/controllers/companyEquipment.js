"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CompanyEquipment_1 = require("../models/CompanyEquipment");
const util_1 = require("util");
const mongodb_1 = require("mongodb");
exports.createCompanyEquipment = (req, res) => {
    const params = req.body;
    CompanyEquipment_1.CompanyEquipment.findOne({ $or: [{ 'info.nfcTag': params.nfcTag, company: new mongodb_1.ObjectId(req.companyId) }, { 'info.qrCode': params.qrCode, company: new mongodb_1.ObjectId(req.companyId) }] }, (err, compEquipmemnt) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (compEquipmemnt != undefined && !util_1.isNull(compEquipmemnt)) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Equipment already added.' });
        }
        var equipment = {
            info: {
                imageUrl: params.imageUrl,
                model: params.model,
                serialNumber: params.serialNumber,
                nfcTag: '',
                qrCode: '',
            },
            type: params.typeId,
            brand: params.brandId,
            company: req.companyId,
        };
        if (params.nfcTag) {
            equipment.info.nfcTag = params.nfcTag;
        }
        else if (params.qrCode) {
            equipment.info.qrCode = params.qrCode;
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.MissingParams });
        }
        const companyEquipment = new CompanyEquipment_1.CompanyEquipment(equipment);
        companyEquipment.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Company Equipment created successfully.' });
        });
    });
};
exports.getCompanyEquipments = (req, res) => {
    CompanyEquipment_1.CompanyEquipment.find({ company: req.companyId })
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'brand',
        select: 'title'
    })
        .exec((err, companyEquipments) => {
        if (err || !companyEquipments) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'companyEquipments': companyEquipments });
    });
};
//# sourceMappingURL=companyEquipment.js.map