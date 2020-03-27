"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const aws_1 = require("../services/aws");
const Job_1 = require("../models/Job");
const Company_1 = require("../models/Company");
const CustomerEquipment_1 = require("../models/CustomerEquipment");
// import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'
exports.createJob = (req, res) => {
    const params = req.body;
    const user = req.user;
    var companyId = req.companyId;
    var company = req.company;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    if (params.equipmentId != undefined && params.equipmentId !== null && params.equipmentId !== '""') {
        CustomerEquipment_1.CustomerEquipment.findById(params.equipmentId, (err, equipment) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError, 'error1': err });
            }
            if (equipment == null || equipment == undefined) {
                return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid equipment id" });
            }
            const job = new Job_1.Job({
                dateTime: params.dateTime,
                jobId: company.currentJobId + 1,
                ticket: params.ticketId,
                technician: params.technicianId,
                customer: params.customerId,
                type: params.jobTypeId,
                company: companyId,
                description: params.description,
                equipmentId: params.equipmentId,
                createdAt: Date.now(),
                createdBy: user._id,
                employeeType: params.employeeType
            });
            job.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError, 'error2': err });
                }
                company.currentJobId = company.currentJobId + 1;
                Company_1.Company.updateOne({ currentJobId: company.currentJobId + 1 }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError, 'error3': err });
                    }
                    Job_1.Job.findById(job.id)
                        .populate({
                        path: 'technician',
                        select: 'profile.displayName auth.email'
                    })
                        .populate({
                        path: 'customer',
                        select: 'profile.displayName info.email'
                    })
                        .populate({
                        path: 'createdBy',
                        select: 'profile.displayName'
                    })
                        .populate({
                        path: 'type',
                        select: 'title'
                    })
                        .exec((err, job) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError, 'error4': err });
                        }
                        var tech = job.technician;
                        var cust = job.customer;
                        var type = job.type;
                        var creator = job.createdBy;
                        aws_1.sendJobEmailToAssignee({ to: tech.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime });
                        aws_1.sendJobEmailToCustomer({ to: cust.info.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime });
                        if (params.employeeType == 1) {
                            aws_1.sendJobEmailToCompanyAdmin({ to: company.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime, vendorName: creator.profile.displayName });
                        }
                        return res.json({ 'status': constants_1.Status.Success, 'message': 'Job created successfully.' });
                    });
                    // return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
                });
            });
        });
    }
    else {
        const job = new Job_1.Job({
            dateTime: params.dateTime,
            jobId: company.currentJobId + 1,
            ticket: params.ticketId,
            technician: params.technicianId,
            customer: params.customerId,
            type: params.jobTypeId,
            company: companyId,
            description: params.description,
            createdAt: Date.now(),
            createdBy: user._id,
            employeeType: params.employeeType
        });
        job.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            company.currentJobId = company.currentJobId + 1;
            Company_1.Company.updateOne({ currentJobId: company.currentJobId + 1 }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                Job_1.Job.findById(job.id)
                    .populate({
                    path: 'technician',
                    select: 'profile.displayName auth.email'
                })
                    .populate({
                    path: 'customer',
                    select: 'profile.displayName info.email'
                })
                    .populate({
                    path: 'createdBy',
                    select: 'profile.displayName'
                })
                    .populate({
                    path: 'type',
                    select: 'title'
                })
                    .exec((err, job) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    var tech = job.technician;
                    var cust = job.customer;
                    var type = job.type;
                    var creator = job.createdBy;
                    aws_1.sendJobEmailToAssignee({ to: tech.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime });
                    aws_1.sendJobEmailToCustomer({ to: cust.info.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime });
                    if (params.employeeType == 1) {
                        aws_1.sendJobEmailToCompanyAdmin({ to: company.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime, vendorName: creator.profile.displayName });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Job created successfully.' });
                });
            });
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
        path: 'ticket',
    })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName'
    })
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'company',
        select: 'info.companyName'
    })
        .populate({
        path: 'createdBy',
        select: 'profile.displayName'
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
        path: 'ticket',
    })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'customer',
        select: 'info.email profile.displayName'
    })
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'company',
        select: 'info.companyName'
    })
        .populate({
        path: 'createdBy',
        select: 'profile.displayName'
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
            return res.json({ 'status': constants_1.Status.Error, 'message': "Edit job is not allowed once it is finished" });
        }
        if (job.status == 3 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Edit job is not allowed once it is canceled" });
        }
        job.updateOne({ description: params.comment, status: params.status }, (err, raw) => {
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
        if (job.status == 2 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "You can't start this job, it is already finished" });
        }
        if (job.status == 3 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "You can't start this job, it is already canceled" });
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
        path: 'ticket',
    })
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