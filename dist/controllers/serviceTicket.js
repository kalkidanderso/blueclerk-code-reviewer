"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const ServiceTicket_1 = require("../models/ServiceTicket");
exports.createServiceTicket = (req, res) => {
    const params = req.body;
    var companyId = req.companyId;
    var user = req.user;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    console.log(companyId);
    const serviceTicket = new ServiceTicket_1.ServiceTicket({
        createdAt: Date.now(),
        scheduleTime: params.scheduleTime,
        customer: params.customerId,
        createdBy: user._id,
        company: companyId,
        comment: params.comment,
        note: params.note,
    });
    console.log(serviceTicket);
    serviceTicket.save((err) => {
        if (err) {
            console.log(err);
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Service ticket created successfully.' });
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
        select: 'info.name'
    })
        .populate({
        path: 'createdBy',
        select: 'profile.displayName'
    })
        .exec((err, serviceTickets) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'serviceTickets': serviceTickets });
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
        serviceTicket.updateOne({ comment: params.comment, note: params.note, scheduleTime: params.scheduleTime }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Ticket updated successfully.' });
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
        select: 'info.name'
    })
        .populate({
        path: 'createdBy',
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