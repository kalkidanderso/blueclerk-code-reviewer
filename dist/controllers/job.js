"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const aws_1 = require("../services/aws");
const Job_1 = require("../models/Job");
const ServiceTicket_1 = require("../models/ServiceTicket");
const Scan_1 = require("../models/Scan");
const PurchaseOrder_1 = require("../models/PurchaseOrder");
const Item_1 = require("../models/Item");
exports.createJob = (req, res) => {
    const params = req.body;
    ServiceTicket_1.ServiceTicket.findById(params.ticketId)
        .then((serviceTicket) => {
        if (serviceTicket == undefined || serviceTicket == null) {
            throw new Error('Invalid ticket Id');
        }
        if (serviceTicket.status == 1 /* CANCELED */) {
            throw new Error('You can\'t create a job using canceled ticket.');
        }
        if (serviceTicket.jobCreated) {
            throw new Error('Job aleady created for this ticket.');
        }
        var jobId = serviceTicket.ticketId.replace("Ticket", 'Job');
        if (params.scheduledStartTime && params.scheduledEndTime) {
            let newStartTime = null;
            let newEndTime = null;
            if (params.scheduledStartTime) {
                var date = new Date(params.scheduleDate);
                newStartTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledStartTime);
            }
            if (params.scheduledStartTime) {
                var date = new Date(params.scheduleDate);
                newEndTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledEndTime);
            }
            return new Promise((resolve, reject) => {
                Job_1.Job.findOne({ $or: [{ company: req.companyId, technician: params.technicianId, scheduleDate: new Date(params.scheduleDate), scheduledStartTime: { $lte: newStartTime }, scheduledEndTime: { $gte: newStartTime } },
                        { company: req.companyId, technician: params.technicianId, scheduleDate: new Date(params.scheduleDate), scheduledStartTime: { $lte: newEndTime }, scheduledEndTime: { $gte: newEndTime } }] }, (err, job) => {
                    if (job != undefined && job != null) {
                        reject(new Error('Technician is scheduled at time you selected, try scheduling after ' + job.scheduledEndTime));
                    }
                    else {
                        resolve([jobId, serviceTicket]);
                    }
                });
            });
        }
        else {
            return [jobId, serviceTicket];
        }
    })
        .then((response) => {
        const jobId = response[0];
        const serviceTicket = response[1];
        _createJob(req, res, jobId, serviceTicket, (req, res, err, newJob) => {
            if (err != null) {
                return res.json({ 'status': constants_1.Status.Error, 'message': err });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job created successfully.' });
        });
    })
        .catch((error) => {
        if (error.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': error.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
    });
};
const _createJob = (req, res, jobId, serviceTicket, next) => {
    const params = req.body;
    const user = req.user;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    const job = new Job_1.Job({
        scheduleDate: params.scheduleDate,
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
    });
    let newStartTime = null;
    let newEndTime = null;
    if (params.scheduledStartTime) {
        var date = new Date(params.scheduleDate);
        newStartTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledStartTime);
        job.scheduledStartTime = newStartTime;
    }
    if (params.scheduledStartTime) {
        var date = new Date(params.scheduleDate);
        newEndTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledEndTime);
        job.scheduledEndTime = newEndTime;
    }
    if (params.equipmentId) {
        job.equipmentId = params.equipmentId;
    }
    job.save((err) => {
        if (err) {
            return next(req, res, constants_1.Messages.GenericError, null);
        }
        serviceTicket.updateOne({ jobCreated: true }, (serviceTicketError, raw) => {
            if (serviceTicketError) {
                return next(req, res, constants_1.Messages.GenericError, null);
            }
            _sendJobEmails(req, res, job, (req, res, newJob) => {
                return next(req, res, null, newJob);
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
        aws_1.sendJobEmailToAssignee({ to: tech.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate });
        aws_1.sendJobEmailToCustomer({ to: cust.info.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate });
        if (params.employeeType == 1) {
            aws_1.sendJobEmailToCompanyAdmin({ to: company.info.companyEmail, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate, vendorName: creator.profile.displayName });
        }
        next(req, res, jobCreated);
        return;
    });
};
exports.getJobs = (req, res) => {
    console.log('in get jobs');
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
        select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName'
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
        select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName'
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
    Job_1.Job.findOne({ _id: params.jobId, company: companyId })
        .then((job) => {
        if (job == undefined || job == null) {
            throw new Error("Invalid job id");
        }
        if (job.status == 2 /* FINISHED */) {
            throw new Error("Update job is not allowed once it is finished");
        }
        if (job.status == 3 /* CANCELED */) {
            throw new Error("Update job is not allowed once it is canceled");
        }
        const itemPromise = Item_1.Item.findOne({ jobType: job.type });
        return Promise.all([job, itemPromise]);
    })
        .then((result) => {
        const job = result[0];
        const item = result[1];
        let timeSpent = 0;
        let newcharges = 0;
        if (item != null && item.charges > 0) {
            if (params.status == 2 && !item.isFixed) {
                let starting = new Date(job.startTime);
                let ending = Date.now();
                let diffMs = (ending - starting);
                let interval = 15 * 60 * 1000;
                timeSpent = ((Math.ceil(diffMs / interval) * interval) / 60000) / 60;
                newcharges = item.charges * timeSpent;
            }
            else if (params.status == 2 && item.isFixed) {
                newcharges = item.charges;
            }
        }
        let finishedOnTime = false;
        let currentTime = Date.now();
        if (job.scheduledEndTime >= currentTime) {
            finishedOnTime = true;
        }
        return job.updateOne({ comment: params.comment, status: params.status, endTime: Date.now(), timeSpent: timeSpent, charges: newcharges, completeOnTime: finishedOnTime });
    })
        .then((response) => {
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Job updated successfully.' });
    })
        .catch((err) => {
        if (err.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': err.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
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
        job.technician = params.technicianId;
        job.scheduleDate = params.scheduleDate;
        let newStartTime = null;
        let newEndTime = null;
        if (params.scheduledStartTime) {
            var date = new Date(params.scheduleDate);
            newStartTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledStartTime);
            job.scheduledStartTime = newStartTime;
        }
        if (params.scheduledStartTime) {
            var date = new Date(params.scheduleDate);
            newEndTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledEndTime);
            job.scheduledEndTime = newEndTime;
        }
        if (params.equipmentId != undefined && params.equipmentId !== null && params.equipmentId !== '""') {
            job.equipmentId = params.equipmentId;
        }
        job.updateOne(job, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Job edited successfully.' });
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
        .then((job) => {
        if (job == undefined || job == null) {
            throw new Error('Invalid job id');
            // return res.json({'status': Status.Error, 'message': "Invalid job id"})
        }
        const scansPrmoise = Scan_1.Scan.find({ job: job._id }, 'comment timeOfScan')
            .populate({
            path: 'equipment',
            select: 'info.model info.serialNumber info.nfcTag images info.location',
            populate: [{ path: 'brand', select: 'title' }, { path: 'type', select: 'title' }],
        });
        const POPromise = PurchaseOrder_1.PurchaseOrder.find({
            job: params.jobId
        });
        return Promise.all([job, scansPrmoise, POPromise]);
    })
        .then((result) => {
        const job = result[0];
        const scans = result[1];
        const POs = result[2];
        return res.json({ 'status': constants_1.Status.Success, 'job': job, 'scans': scans, 'purchaseOrders': POs });
    })
        .catch((error) => {
        if (error.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': error.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
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
        select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone contactName'
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
        .then((job) => {
        if (job == undefined || job == null) {
            throw new Error('Invalid job id');
        }
        if (job.status != 2 /* FINISHED */) {
            throw new Error('Job is not finished yet');
        }
        const scansPrmoise = Scan_1.Scan.find({ job: job._id }, 'comment timeOfScan')
            .populate({
            path: 'equipment',
            select: 'info.model info.serialNumber info.nfcTag images info.location',
            populate: [{ path: 'brand', select: 'title' }, { path: 'type', select: 'title' }],
        });
        const POPromise = PurchaseOrder_1.PurchaseOrder.find({
            job: params.jobId
        });
        return Promise.all([job, scansPrmoise, POPromise]);
    })
        .then((result) => {
        const job = result[0];
        const scans = result[1];
        const POs = result[2];
        if (scans.length == 0) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "No equipment scanned for this job." });
        }
        else {
            return res.json({ 'status': constants_1.Status.Success, 'job': job, 'scans': scans, 'purchaseOrders': POs });
        }
    })
        .catch((error) => {
        if (error.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': error.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
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
        select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName'
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
    Job_1.Job.findOne({ _id: params.jobId, company: companyId })
        .then((job) => {
        if (job == undefined || job == null) {
            throw new Error("Invalid job id");
        }
        if (job.status == 2 /* FINISHED */) {
            throw new Error("Edit job is not allowed once it is finished");
        }
        if (job.status == 3 /* CANCELED */) {
            throw new Error("Edit job is not allowed once it is canceled");
        }
        if ((params.startTime == undefined || params.startTime == null) && (params.endTime == undefined || params.endTime == null)) {
            throw new Error('Start time or end time is required');
        }
        const itemPromise = Item_1.Item.findOne({ jobType: job.type });
        return Promise.all([job, itemPromise]);
    })
        .then((result) => {
        const job = result[0];
        const item = result[1];
        let timeSpent = 0;
        let newcharges = 0;
        let startTime = job.startTime;
        let endTime = job.startTime;
        if (params.startTime != undefined && params.startTime != null && params.startTime != '""') {
            startTime = params.startTime;
        }
        if (params.endTime != undefined && params.endTime != null && params.endTime != '""') {
            endTime = params.endTime;
        }
        if (item != null && item.charges > 0) {
            if (params.status == 2 && !item.isFixed) {
                let starting = new Date(startTime);
                let ending = new Date(endTime);
                let diffMs = (ending - starting);
                let interval = 15 * 60 * 1000;
                timeSpent = ((Math.ceil(diffMs / interval) * interval) / 60000) / 60;
                newcharges = item.charges * timeSpent;
            }
            else if (params.status == 2 && item.isFixed) {
                newcharges = item.charges;
            }
        }
        const user = req.user;
        return job.updateOne({ startTime: startTime, endTime: endTime, timeSpent: timeSpent, charges: newcharges, timeUpdatedBy: user._id, timeUpdatedAt: Date.now() });
    })
        .then((response) => {
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Job time updated successfully.' });
    })
        .catch((err) => {
        if (err.message != undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': err.message });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
    });
};
//# sourceMappingURL=job.js.map