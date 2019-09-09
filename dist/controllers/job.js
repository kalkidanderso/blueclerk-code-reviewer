"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Job_1 = require("../models/Job");
exports.createJob = (req, res) => {
    const params = req.body;
    const subscriber = req.user;
    const job = new Job_1.Job({
        dateTime: params.dateTime,
        technician: params.technicianId,
        customer: params.customerId,
        type: params.jobTypeId,
        subscriber: subscriber._id
    });
    job.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Job created successfully.' });
    });
};
exports.getJobs = (req, res) => {
    const user = req.user;
    var subscriberId;
    if (user.subscriber) {
        subscriberId = user.subscriber;
    }
    else {
        subscriberId = user._id;
    }
    Job_1.Job.find({ subscriber: subscriberId }, (err, jobs) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'jobs': jobs });
    });
};
//# sourceMappingURL=job.js.map