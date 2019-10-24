"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const JobType_1 = require("../models/JobType");
exports.createJobType = (req, res) => {
    const params = req.body;
    const user = req.user;
    var userId = null;
    if (user.permissions.role == 3 /* COMPANY */) {
        userId = user._id;
    }
    if (user.permissions.role != 4 /* GLOBAL_ADMIN */) {
        userId = req.companyId;
    }
    const jobType = new JobType_1.JobType({
        title: params.title,
        createdBy: userId
    });
    jobType.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type created successfully.' });
    });
};
exports.getJobTypes = (req, res) => {
    JobType_1.JobType.find({ $or: [{ createdBy: null }, { createdBy: req.companyId }] }, (err, types) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'types': types });
    });
};
//# sourceMappingURL=jobType.js.map