"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CustomerEquipment_1 = require("../models/CustomerEquipment");
const Customer_1 = require("../models/Customer");
const Job_1 = require("../models/Job");
const mongodb_1 = require("mongodb");
const util_1 = require("util");
exports.createCustomerEquipment = (req, res) => {
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag }, (err, customerEquipment) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (customerEquipment != undefined && !util_1.isNull(customerEquipment)) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Equipment already added.' });
        }
        const equipment = new CustomerEquipment_1.CustomerEquipment({
            info: {
                model: params.model,
                serialNumber: params.serialNumber,
                nfcTag: params.nfcTag,
                imageUrl: params.imageUrl,
                location: params.location,
            },
            type: params.equipmentTypeId,
            brand: params.equipmentBrandId,
            customer: params.customerId,
        });
        equipment.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            Customer_1.Customer.findOne({ '_id': params.customerId }, (err, customer) => {
                if (err || !customer) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                customer.equipments.push(equipment._id);
                customer.updateOne({ equipments: customer.equipments }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer equipment created successfully.' });
                });
            });
        });
    });
};
exports.getCustomerEquipments = (req, res) => {
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.find({ customer: new mongodb_1.ObjectId(params.customerId) })
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'brand',
        select: 'title'
    })
        .exec((err, customerEquipments) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'equipments': customerEquipments });
    });
};
exports.getCustomerEquipmentJobs = (req, res) => {
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.findOne({ _id: params.equipmentId })
        .exec((err, customerEquipment) => {
        if (err || !customerEquipment) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        var jobIds = customerEquipment.jobs;
        Job_1.Job.find({ _id: { $in: jobIds }, company: req.companyId })
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
            .exec((err, companyJobs) => {
            if (err || !companyJobs) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            Job_1.Job.find({ _id: { $in: jobIds }, company: { $ne: req.companyId } }, '_id comment dateTime')
                .exec((err, nonCompanyJobs) => {
                if (err || !nonCompanyJobs) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                var allJobs = companyJobs.concat(nonCompanyJobs);
                // return res.json({ 'status': Status.Success, 'jobs': allJobs })
                allJobs.sort(function (a, b) {
                    var keyA = new Date(a.dateTime), keyB = new Date(b.dateTime);
                    // Compare the 2 dates
                    if (keyA > keyB)
                        return -1;
                    if (keyA < keyB)
                        return 1;
                    return 0;
                });
                return res.json({ 'status': constants_1.Status.Success, 'jobs': allJobs });
            });
        });
    });
};
exports.linkJobToEquipment = (req, res) => {
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err, customerEquipment) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError, "err": err });
        }
        if (customerEquipment == undefined || customerEquipment == null) {
            return res.json({ 'status': constants_1.Status.Error, "message": "customer equipment is null", "tag": params.nfcTag });
        }
        return res.json({ 'status': constants_1.Status.Success, "equipment": customerEquipment });
        var index = customerEquipment.jobs.indexOf(params.jobId);
        if (index !== -1) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Job already linked to equipment.' });
        }
        customerEquipment.jobs.push(params.jobId);
        customerEquipment.updateOne({ jobs: customerEquipment.jobs }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError, "err": err });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer equipment job added successfully.' });
        });
    });
};
//# sourceMappingURL=customerEquipment.js.map