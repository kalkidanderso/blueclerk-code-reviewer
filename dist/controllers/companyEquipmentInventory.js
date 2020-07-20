"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CompanyEquipment_1 = require("../models/CompanyEquipment");
const CompanyEquipmentInventory_1 = require("../models/CompanyEquipmentInventory");
const Group_1 = require("../models/Group");
const mongodb_1 = require("mongodb");
exports.createCompanyEquipmentInventory = (req, res) => {
    const params = req.body;
    const user = req.user;
    if (params.nfcTags == undefined && params.qrCodes == undefined) {
        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.MissingParams });
    }
    var nfcTags = [];
    if (params.nfcTags != undefined) {
        nfcTags = params.nfcTags.split(',');
    }
    var qrCodes = [];
    if (params.qrCodes != undefined) {
        qrCodes = params.qrCodes.split(',');
    }
    CompanyEquipment_1.CompanyEquipment.find({ $or: [{ 'info.nfcTag': { $in: nfcTags } }, { 'info.qrCode': { $in: qrCodes } }] }, '_id', (err, companyEquipments) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        var ids = companyEquipments.map(function (item) {
            return item._id;
        });
        const companyEquipmentInventory = new CompanyEquipmentInventory_1.CompanyEquipmentInventory({
            dateTime: params.dateTime,
            createdBy: user._id,
            noOfItems: ids.length,
            companyEquipments: ids
        });
        companyEquipmentInventory.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Inventory created successfully.' });
        });
    });
};
exports.getIventoryHistory = (req, res) => {
    const user = req.user;
    Group_1.Group.findOne({ members: new mongodb_1.ObjectId(user._id) }, (err, group) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (group == null || group == undefined) {
            return res.json({ 'status': constants_1.Status.Success, 'companyEquipmentInventory': [] });
        }
        const members = group.members.map((id) => {
            return id;
        });
        CompanyEquipmentInventory_1.CompanyEquipmentInventory.find({ createdBy: { $in: members } })
            .populate({
            path: 'createdBy',
            select: 'profile.displayName',
        })
            .exec((err, companyEquipmentInventory) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'companyEquipmentInventory': companyEquipmentInventory });
        });
    });
};
//# sourceMappingURL=companyEquipmentInventory.js.map