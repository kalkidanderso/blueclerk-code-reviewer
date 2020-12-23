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
                _createItem(req, res, jobType, null, (req, res) => {
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type created successfully.' });
                });
            });
        });
    }
    else {
        var searchTitle = params.title.toLowerCase();
        JobType_1.JobType.findOne({ title: { $regex: new RegExp(searchTitle, "i") }, createdBy: req.companyId }, (err, previousJobType) => {
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
                _createItem(req, res, jobType, req.companyId, (req, res) => {
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type created successfully.' });
                });
            });
        });
    }
};
const _createItem = (req, res, jobType, companyId, next) => {
    const params = req.body;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    const item = new Item_1.Item({
        name: params.title,
        company: companyId,
        jobType: jobType._id,
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
        JobType_1.JobType.find({ $or: [{ createdBy: null, industry: req.company.info.industry, isActive: true }, { createdBy: req.companyId, isActive: true }] }, (err, types) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            res.json({ 'status': constants_1.Status.Success, 'types': types });
        });
    }
};
exports.editJobType = (req, res) => {
    const params = req.body;
    JobType_1.JobType.findOne({ _id: params.jobTypeId }, (err, jobType) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (jobType == undefined || jobType == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid job Type id" });
        }
        if (!jobType.isActive) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Job type is inactive activate to edit." });
        }
        if (jobType.title == params.title) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Job type with title " + params.title + " already exists." });
        }
        jobType.updateOne({ title: params.title }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            _updateItem(req, res, jobType, params.title, (req, res) => {
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type update successfully.' });
            });
        });
    });
};
const _updateItem = (req, res, jobType, jobTitle, next) => {
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Item_1.Item.findOne({ jobType: jobType._id }, (err, item) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (item != undefined && item != null) {
            let name = jobTitle;
            if (item.isFixed) {
                name = jobTitle + ' - fixed';
            }
            else {
                name = jobTitle + ' - hourly';
            }
            item.updateOne({ name: name }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                next(req, res);
                return;
            });
        }
        else {
            const item = new Item_1.Item({
                name: jobType.title,
                company: companyId,
                jobType: jobType._id,
            });
            item.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                next(req, res);
                return;
            });
        }
    });
};
exports.changeJobTypeStatus = (req, res) => {
    const params = req.body;
    JobType_1.JobType.findOne({ _id: params.jobTypeId }, (err, jobType) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (jobType == undefined || jobType == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid job Type id" });
        }
        jobType.updateOne({ isActive: params.status }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            _updateItemStatus(req, res, jobType, params.status, (req, res) => {
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type status update successfully.' });
            });
        });
    });
};
const _updateItemStatus = (req, res, jobType, itemStatus, next) => {
    Item_1.Item.findOne({ jobType: jobType._id }, (err, item) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (item != undefined && item != null) {
            let name = jobType.title;
            if (item.isFixed) {
                name = name + ' - fixed';
            }
            else {
                name = name + ' - hourly';
            }
            item.updateOne({ isActive: itemStatus }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                next(req, res);
                return;
            });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Item for this job type not found' });
        }
    });
};
exports.getAllItems = (req, res) => {
    Item_1.Item.find({ $or: [{ company: null, isActive: true }, { company: req.companyId, isActive: true }] }, (err, items) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'items': items });
    });
};
exports.updateItem = (req, res) => {
    const params = req.body;
    Item_1.Item.findOne({ _id: params.itemId }, (err, item) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (item == null || item == undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid item id' });
        }
        let name;
        if (params.isFixed) {
            name = item.name + ' - hourly';
        }
        else {
            name = item.name + ' - fixed';
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