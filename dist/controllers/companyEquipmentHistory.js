"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CompanyEquipment_1 = require("../models/CompanyEquipment");
const CompanyEquipmentHistory_1 = require("../models/CompanyEquipmentHistory");
exports.createCompanyEquipmentHistory = (req, res) => {
    const params = req.body;
    const user = req.user;
    if (!params.nfcTag && !params.qrCode) {
        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.MissingParams });
    }
    CompanyEquipment_1.CompanyEquipment.findOne({ $or: [{ nfcTag: params.nfcTag }, { qrCode: params.qrCode }] }, (err, companyEquipment) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        var equipmentHistory = {
            action: -1,
            dateTime: params.dateTime,
            companyEquipment: companyEquipment._id,
            createdBy: user._id,
        };
        if (params.action == 0 /* CHECKIN */) {
            equipmentHistory.action = 0 /* CHECKIN */;
        }
        else if (params.action == 1 /* CHECKOUT */) {
            equipmentHistory.action = 0 /* CHECKIN */;
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid input for action.' });
        }
        const companyEquipmentHistory = new CompanyEquipmentHistory_1.CompanyEquipmentHistory(equipmentHistory);
        companyEquipmentHistory.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Company Equipment History created successfully.' });
        });
    });
};
//# sourceMappingURL=companyEquipmentHistory.js.map