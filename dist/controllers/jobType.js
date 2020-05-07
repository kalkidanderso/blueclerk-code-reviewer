"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const JobType_1 = require("../models/JobType");
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
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type created successfully.' });
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
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type created successfully.' });
            });
        });
    }
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
//# sourceMappingURL=jobType.js.map