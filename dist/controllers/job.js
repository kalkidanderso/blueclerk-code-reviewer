"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Job_1 = require("../models/Job");
const ServiceTicket_1 = require("../models/ServiceTicket");
const Scan_1 = require("../models/Scan");
const JobCharges_1 = require("../models/JobCharges");
exports.createJob = (req, res) => {
    const params = req.body;
    ServiceTicket_1.ServiceTicket.findById(params.ticketId, (err, serviceTicket) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (serviceTicket == undefined || serviceTicket == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid ticket Id' });
        }
        if (serviceTicket.status == 1 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'You can\'t create a job using canceled ticket.' });
        }
        if (serviceTicket.jobCreated) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Job aleady created for this ticket.' });
        }
        JobCharges_1.JobCharges.findOne({ 'company': req.companyId, 'jobType': params.jobTypeId }, (err, charges) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if ((charges == undefined || charges == null) && (params.charges == undefined || params.charges == null)) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Job Charges are required' });
            }
            var jobId = serviceTicket.ticketId.replace("Ticket", 'Job');
            _createJob(req, res, jobId, serviceTicket, charges, (req, res, newJob) => {
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Job created successfully.' });
            });
        });
    });
};
const _createJob = (req, res, jobId, serviceTicket, charges, next) => {
    const params = req.body;
    console.log(params);
    const user = req.user;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    const job = new Job_1.Job({
        dateTime: params.dateTime,
        jobId: jobId,
        ticket: params.ticketId,
        technician: params.technicianId,
        customer: params.customerId,
        type: params.jobTypeId,
        company: companyId,
        description: params.description,
        createdAt: Date.now(),
        createdBy: user._id,
        employeeType: params.employeeType,
        isFixed: params.isFixed
    });
    if (params.equipmentId != undefined && params.equipmentId !== null && params.equipmentId !== '""') {
        job.equipmentId = params.equipmentId;
    }
    if (params.isFixed == 'false') {
        if (params.charges != undefined && params.charges !== null && params.charges !== '""') {
            job.hourlyRate = params.charges;
        }
        else {
            job.hourlyRate = charges.charges;
        }
    }
    else {
        if (params.charges != undefined && params.charges !== null && params.charges !== '""') {
            job.charges = params.charges;
        }
        else {
            job.charges = charges.charges;
        }
    }
    job.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        serviceTicket.updateOne({ jobCreated: true }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            _sendJobEmails(req, res, job, (req, res, newJob) => {
                next(req, res, newJob);
                return;
            });
        });
    });
};
const _sendJobEmails = (req, res, jobCreated, next) => {
    const params = req.body;
    const company = req.company;
    Job_1.Job.findById(jobCreated._id)
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
        // sendJobEmailToAssignee({to: tech.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime})
        // sendJobEmailToCustomer({to: cust.info.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime})
        // if(params.employeeType == 1) {
        //     sendJobEmailToCompanyAdmin({to: company.info.companyEmail, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime, vendorName: creator.profile.displayName})
        // }
        next(req, res, jobCreated);
        return;
    });
};
exports.getJobs = (req, res) => {
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Job_1.Job.find({ company: companyId })
        .populate({
        path: 'ticket',
        select: 'scheduleDateTime note ticketId'
    })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode'
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
        select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode'
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
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Job_1.Job.findOne({ _id: params.jobId, company: companyId }, (err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (job == undefined || job == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid job id" });
        }
        if (job.status == 2 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Edit job is not allowed once it is finished" });
        }
        if (job.status == 3 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Edit job is not allowed once it is canceled" });
        }
        let timeSpent = 0;
        let newcharges = job.charges;
        if (params.status == 2 && !job.isFixed) {
            let starting = new Date(job.startTime);
            let ending = Date.now();
            let diffMs = (ending - starting);
            let interval = 15 * 60 * 1000;
            timeSpent = ((Math.ceil(diffMs / interval) * interval) / 60000) / 60;
            newcharges = job.hourlyRate * timeSpent;
        }
        job.updateOne({ comment: params.comment, status: params.status, endTime: Date.now(), timeSpent: timeSpent, charges: newcharges }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job updated successfully.' });
        });
    });
};
exports.startJob = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Job_1.Job.findOne({ _id: params.jobId, company: companyId }, (err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (job == undefined || job == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid job id" });
        }
        if (job.status == 2 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "You can't start this job, it is already finished" });
        }
        if (job.status == 3 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "You can't start this job, it is already canceled" });
        }
        job.updateOne({ status: 1 /* STARTED */, startTime: Date.now() }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job started successfully.' });
        });
    });
};
exports.editJob = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Job_1.Job.findOne({ _id: params.jobId, company: companyId }, (err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (job == undefined || job == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid job id" });
        }
        if (job.status == 3 /* CANCELED */ || job.status == 2 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Edit job is not allowed onece it is cancelled or finished" });
        }
        JobCharges_1.JobCharges.findOne({ 'company': req.companyId, 'jobType': job.type }, (err, charges) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if ((charges == undefined || charges == null) && (params.charges == undefined || params.charges == null)) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Job Charges are required' });
            }
            if (params.charges != undefined && params.charges != null) {
                job.charges = params.charges;
            }
            job.isFixed = params.isFixed;
            job.technician = params.technicianId;
            job.dateTime = params.dateTime;
            job.updateOne(job, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Job edited successfully.' });
            });
        });
    });
};
exports.getJobDetails = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Job_1.Job.findOne({ _id: params.jobId, company: companyId })
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
        if (job == undefined || job == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid job id" });
        }
        return res.json({ 'status': constants_1.Status.Success, 'job': job });
    });
};
exports.getJobReport = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Job_1.Job.findOne({ _id: params.jobId, company: companyId })
        .populate({
        path: 'ticket',
        select: 'ticketId note scheduleDateTime'
    })
        .populate({
        path: 'technician',
        select: 'profile.displayName auth.email contact.phone permissions.role'
    })
        .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .populate({
        path: 'createdBy',
        select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .exec((err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (job == undefined || job == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid job id" });
        }
        if (job.status != 2 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Job is not finished yet" });
        }
        // scans
        Scan_1.Scan.find({ job: job._id }, 'comment timeOfScan')
            .populate({
            path: 'equipment',
            select: 'info.model info.serialNumber info.nfcTag images info.location',
            populate: [{ path: 'brand', select: 'title' }, { path: 'type', select: 'title' }],
        })
            .exec((err, scans) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (scans.length == 0) {
                return res.json({ 'status': constants_1.Status.Error, 'message': "No equipment scanned for this job." });
            }
            return res.json({ 'status': constants_1.Status.Success, 'job': job, 'scans': scans });
        });
    });
};
exports.getTodaysJobsByTechnicianId = (req, res) => {
    var date = new Date();
    date.setHours(0, 0, 0, 0);
    var endDate = new Date();
    endDate.setHours(23, 59, 59, 59);
    const params = req.body;
    Job_1.Job.find({ technician: params.employeeId, $and: [{ status: { $ne: 2 } }, { status: { $ne: 3 } }], dateTime: {
            $gte: date,
            $lte: endDate
        } })
        .populate({
        path: 'ticket',
    })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode'
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
exports.updateJobTime = (req, res) => {
    const params = req.body;
    const user = req.user;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Job_1.Job.findOne({ _id: params.jobId, company: companyId }, (err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (job == undefined || job == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid job id" });
        }
        JobCharges_1.JobCharges.findOne({ 'company': req.companyId, 'jobType': job.type }, (err, charges) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if ((params.startTime == undefined || params.startTime == null) && (params.endTime == undefined || params.endTime == null)) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Start time or end time is required' });
            }
            let timeSpent = 0;
            let newcharges = job.charges;
            if (job.status == 2 && !job.isFixed) {
                let starting = new Date(job.startTime);
                let ending = Date.now();
                let diffMs = (ending - starting);
                let interval = 15 * 60 * 1000;
                timeSpent = ((Math.ceil(diffMs / interval) * interval) / 60000) / 60;
                newcharges = job.hourlyRate * timeSpent;
                job.timeSpent = timeSpent;
                job.charges = newcharges;
            }
            if (params.startTime != undefined && params.startTime != null && params.startTime != '""') {
                job.startTime = params.startTime;
                job.timeUpdatedBy = user._id;
                job.timeUpdatedAt = new Date();
            }
            if (params.endTime != undefined && params.endTime != null && params.endTime != '""') {
                job.endTime = params.endTime;
                job.timeUpdatedBy = user._id;
                job.timeUpdatedAt = new Date();
            }
            job.updateOne(job, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Job time updated successfully.' });
            });
        });
    });
};
//# sourceMappingURL=job.js.map