"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Job_1 = require("../models/Job");
const CustomerEquipment_1 = require("../models/CustomerEquipment");
exports.createJob = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    if (params.equipmentId != undefined && params.equipmentId != null) {
        CustomerEquipment_1.CustomerEquipment.findById(params.equipmentId, (err, equipment) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            const job = new Job_1.Job({
                dateTime: params.dateTime,
                technician: params.technicianId,
                customer: params.customerId,
                type: params.jobTypeId,
                company: companyId,
                comment: '',
                description: params.description,
                equipmentId: params.equipmentId,
                createdAt: Date.now(),
            });
            job.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                equipment.jobs.push(job._id);
                equipment.updateOne({ jobs: equipment.jobs }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Job created successfully.' });
                });
            });
        });
    }
    else {
        const job = new Job_1.Job({
            dateTime: params.dateTime,
            technician: params.technicianId,
            customer: params.customerId,
            type: params.jobTypeId,
            company: companyId,
            comment: '',
            description: params.description,
            equipmentId: params.equipmentId,
            createdAt: Date.now(),
        });
        job.save((err) => {
            if (err) {
                console.log(err);
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job created successfully.' });
        });
    }
};
exports.getJobs = (req, res) => {
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Job_1.Job.find({ company: companyId })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'customer',
        select: 'info.name'
    })
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'company',
        select: 'info.companyName'
    })
        .exec((err, jobs) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'jobs': jobs });
    });
};
exports.getJobsByTechnicianId = (req, res) => {
    const params = req.body;
    Job_1.Job.find({ technician: params.employeeId })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'customer',
        select: 'info.name'
    })
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'company',
        select: 'info.companyName'
    })
        .exec((err, jobs) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'jobs': jobs });
    });
};
exports.updateJob = (req, res) => {
    const params = req.body;
    Job_1.Job.findOne({ _id: params.jobId }, (err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (job.status == 2 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Edit job is not allowed onece it is finished" });
        }
        job.updateOne({ comment: params.comment, status: params.status }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job updated successfully.' });
        });
    });
};
exports.startJob = (req, res) => {
    const params = req.body;
    Job_1.Job.findOne({ _id: params.jobId }, (err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        job.updateOne({ status: 1 /* STARTED */ }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job started successfully.' });
        });
    });
};
exports.editJob = (req, res) => {
    const params = req.body;
    Job_1.Job.findOne({ _id: params.jobId }, (err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (job.status == 3 /* CANCELED */ || job.status == 2 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Edit job is not allowed onece it is cancelled or finished" });
        }
        job.updateOne({ technician: params.technicianId, dateTime: params.dateTime }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job edited successfully.' });
        });
    });
};
exports.getJobDetails = (req, res) => {
    const params = req.body;
    Job_1.Job.findById(params.jobId)
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'customer'
    })
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'equipmentId',
        select: 'info.model info.serialNumber info.imageUrl'
    })
        .populate({
        path: 'company',
        select: 'info profile address contact'
    })
        .exec((err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'job': job });
    });
};
//# sourceMappingURL=job.js.map