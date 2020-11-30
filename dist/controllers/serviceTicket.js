"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const ServiceTicket_1 = require("../models/ServiceTicket");
exports.createServiceTicket = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    var user = req.user;
    var company = req.company;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    var ticketId = 'Ticket ' + (company.currentJobId + 1);
    if (company.prefix != undefined && company.prefix != null && company.prefix == '""') {
        ticketId = 'Ticket ' + company.prefix + '-' + (company.currentJobId + 1);
    }
    var dueDate = params.dueDate ? new Date(params.dueDate) : null;
    const serviceTicket = new ServiceTicket_1.ServiceTicket({
        createdAt: Date.now(),
        dueDate: dueDate,
        customer: params.customerId,
        createdBy: user._id,
        company: companyId,
        note: params.note,
        technician: params.technicianId,
        ticketId: ticketId,
        jobLocation: params.jobLocationId,
        jobSite: params.jobSiteId,
        jobType: params.jobTypeId,
    });
    serviceTicket.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        company.updateOne({ currentJobId: company.currentJobId + 1 })
            .exec((err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Service ticket created successfully.' });
        });
    });
};
exports.getServiceTickets = (req, res) => {
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    ServiceTicket_1.ServiceTicket.find({ company: companyId })
        .populate({
        path: 'customer',
        select: 'info.email profile.displayName contactName',
    })
        .populate({
        path: 'createdBy',
        select: 'profile.displayName'
    })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'editedBy',
        select: 'profile.displayName'
    })
        .exec((err, serviceTickets) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'serviceTickets': serviceTickets });
    });
};
exports.getServiceTicketsWithPagination = (req, res) => {
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    var serviceTickets;
    var maxCount;
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    var criteria = {
        company: companyId
    };
    var projection = {};
    var option = {
        lean: true,
        sort: { createdAt: -1 }
    };
    const Query = ServiceTicket_1.ServiceTicket.find(criteria, projection, option);
    if (pageSize && currentPage) {
        Query.skip(pageSize * (currentPage - 1)).limit(pageSize);
    }
    Query.populate({
        path: 'customer',
        select: 'info.email profile.displayName contactName address',
    })
        .populate({
        path: 'JobSite'
    })
        .populate({
        path: 'JobLocation'
    })
        .populate({
        path: 'createdBy',
        select: 'profile.displayName'
    })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'editedBy',
        select: 'profile.displayName'
    }).then((documents) => {
        serviceTickets = documents;
        return ServiceTicket_1.ServiceTicket.countDocuments();
    }).then((count) => {
        maxCount = count;
        return res.json({ 'status': constants_1.Status.Success, 'serviceTickets': serviceTickets, 'Total': maxCount });
    }).catch((err) => {
        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
    });
};
exports.updateServiceTicket = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    ServiceTicket_1.ServiceTicket.findOne({ _id: params.ticketId, company: companyId }, (err, serviceTicket) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (serviceTicket.status == 1 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Ticket is canceled' });
        }
        let dueDate = serviceTicket.dueDate;
        if (params.dueDate) {
            dueDate = new Date(params.dueDate);
        }
        let jobLocationId = serviceTicket.jobLocation;
        jobLocationId = params.jobLocationId;
        let jobSiteId = serviceTicket.jobSite;
        jobSiteId = params.jobSiteId;
        let jobTypeId = serviceTicket.jobType;
        jobTypeId = params.jobTypeId;
        serviceTicket.updateOne({ note: params.note, dueDate: dueDate, jobLocation: jobLocationId, jobSite: jobSiteId, jobType: jobTypeId }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Ticket updated successfully.' });
        });
    });
};
exports.editServiceTicket = (req, res) => {
    const params = req.body;
    const user = req.user;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    ServiceTicket_1.ServiceTicket.findOne({ _id: params.ticketId, company: companyId }, (err, serviceTicket) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (params.status != 1 /* CANCELED */ && params.status != 0 /* ACTIVE */ && params.status != 2 /* REACTIVE */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid ticket status' });
        }
        serviceTicket.updateOne({ status: params.status, editedBy: user._id, editedAt: Date.now() }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Ticket status changed successfully.' });
        });
    });
};
exports.getServiceTicketDetail = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    ServiceTicket_1.ServiceTicket.findOne({ _id: params.ticketId, company: companyId })
        .populate({
        path: 'customer',
        select: 'info.email profile.displayName contactName'
    })
        .populate({
        path: 'createdBy',
        select: 'profile.displayName'
    })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
    })
        .populate({
        path: 'editedBy',
        select: 'profile.displayName'
    })
        .exec((err, serviceTicket) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'serviceTicket': serviceTicket });
    });
};
//# sourceMappingURL=serviceTicket.js.map