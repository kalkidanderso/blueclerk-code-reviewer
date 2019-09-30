"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Job_1 = require("../models/Job");
exports.createJob = (req, res) => {
    const params = req.body;
    const job = new Job_1.Job({
        dateTime: params.dateTime,
        technician: params.technicianId,
        customer: params.customerId,
        type: params.jobTypeId,
        company: req.companyId,
        comment: ''
    });
    job.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Job created successfully.' });
    });
};
exports.getJobs = (req, res) => {
    Job_1.Job.find({ company: req.companyId }, (err, jobs) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'jobs': jobs });
    });
};
exports.updateJob = (req, res) => {
    const params = req.body;
    Job_1.Job.findOne({ _id: params.jobId }, (err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        job.updateOne({ comment: params.comment, status: params.status }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job updated successfully.' });
        });
    });
};
//# sourceMappingURL=job.js.map