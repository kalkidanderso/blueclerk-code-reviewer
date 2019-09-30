"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CompanyEquipment_1 = require("../models/CompanyEquipment");
exports.createCompanyEquipment = (req, res) => {
    const params = req.body;
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