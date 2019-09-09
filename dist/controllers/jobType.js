"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const JobType_1 = require("../models/JobType");
exports.createJobType = (req, res) => {
    const params = req.body;
    const user = req.user;
    const jobType = new JobType_1.JobType({
        title: params.title,
        createdBy: user.permissions.role == 3 /* SUBSCRIBER */ ? user._id : null
    });
    jobType.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Job type created successfully.' });
    });
};
exports.getJobTypes = (req, res) => {
    const user = req.user;
    const nonSubscriber = user;
    var createdBy;
    if (nonSubscriber.subscriber) {
        createdBy = nonSubscriber.subscriber;
    }
    else {
        createdBy = user._id;
    }
    JobType_1.JobType.find({ $or: [{ createdBy: null }, { createdBy: createdBy }] }, (err, types) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'types': types });
    });
};
//# sourceMappingURL=jobType.js.map