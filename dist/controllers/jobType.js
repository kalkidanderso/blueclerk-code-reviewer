"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const JobType_1 = require("../models/JobType");
const Item_1 = require("../models/Item");
exports.createJobType = (req, res) => {
    const params = req.body;
    const user = req.user;
    var userId = null;
    var industryId = null;
    if (user.permissions.role == 3 /* COMPANY_ADMIN */) {
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
    if (industryId != null && industryId != undefined) {
        JobType_1.JobType.findOne({ title: params.title, industry: industryId, createdBy: null }, (err, previousJobType) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (previousJobType != undefined || previousJobType != null) {
                return res.json({ 'status': constants_1.Status.Error, 'message': "Job Type already created for this industry" });
            }
            const jobType = new JobType_1.JobType({
                title: params.title,
                industry: industryId,
                createdBy: userId
            });
            jobType.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                _createItem(req, res, (req, res) => {
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type created successfully.' });
                });
            });
        });
    }
    else {
        JobType_1.JobType.findOne({ title: params.title, createdBy: req.companyId }, (err, previousJobType) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (previousJobType != undefined || previousJobType != null) {
                return res.json({ 'status': constants_1.Status.Error, 'message': "Job Type already created" });
            }
            const jobType = new JobType_1.JobType({
                title: params.title,
                industry: industryId,
                createdBy: userId
            });
            jobType.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                console.log("creating item");
                _createItem(req, res, (req, res) => {
                    console.log("item created");
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type created successfully.' });
                });
            });
        });
    }
};
const _createItem = (req, res, next) => {
    console.log("inside");
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    const item = new Item_1.Item({
        name: params.title,
        company: companyId
    });
    item.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        next(req, res);
        return;
    });
};
exports.getJobTypes = (req, res) => {
    const user = req.user;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    if (user.permissions.role == 4 /* GLOBAL_ADMIN */) {
        JobType_1.JobType.find({}, (err, types) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            res.json({ 'status': constants_1.Status.Success, 'types': types });
        });
    }
    else {
        JobType_1.JobType.find({ $or: [{ createdBy: null, industry: req.company.info.industry }, { createdBy: req.companyId }] }, (err, types) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            res.json({ 'status': constants_1.Status.Success, 'types': types });
        });
    }
};
exports.getAllItems = (req, res) => {
    Item_1.Item.find({ company: req.companyId }, (err, items) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'items': items });
    });
};
exports.updateItem = (req, res) => {
    const params = req.body;
    Item_1.Item.findOne({ company: req.companyId, _id: params.itemId }, (err, item) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (item == null || item == undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid item id' });
        }
        let name;
        if (params.isFixed) {
            name = item.name + ' - Hourly';
        }
        else {
            name = item.name + ' - Fixed';
        }
        item.updateOne({ name: name, charges: params.charges, tax: params.tax, isFixed: params.isFixed }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Item updated successfully' });
        });
    });
};
//# sourceMappingURL=jobType.js.map