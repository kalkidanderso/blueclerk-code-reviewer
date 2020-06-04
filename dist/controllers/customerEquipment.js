"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CustomerEquipment_1 = require("../models/CustomerEquipment");
const Customer_1 = require("../models/Customer");
const Job_1 = require("../models/Job");
const Scan_1 = require("../models/Scan");
const mongodb_1 = require("mongodb");
const util_1 = require("util");
exports.createCustomerEquipment = (req, res) => {
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag, customer: new mongodb_1.ObjectId(params.customerId) }, (err, customerEquipment) => {
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
                    if (params.images != undefined && params.images != '') {
                        var images = [];
                        var urls = params.images.split(',').map(String);
                        urls.map((url) => {
                            equipment.images.push(url);
                        });
                        equipment.updateOne({ images: equipment.images }, (err, raw) => {
                            if (err) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                            }
                            return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer equipment created successfully.' });
                        });
                    }
                    else {
                        return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer equipment created successfully.' });
                    }
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
        .populate({
        path: 'customer',
        select: 'profile.displayName'
    })
        .exec((err, customerEquipments) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'equipments': customerEquipments });
    });
};
exports.getCustomerEquipmentJobs = (req, res) => {
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err, customerEquipment) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (customerEquipment == undefined || customerEquipment == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No equipment found. Please try again' });
        }
        Scan_1.Scan.find({ equipment: customerEquipment._id })
            .populate({
            path: 'job',
        })
            .populate({
            path: 'equipment',
        })
            .exec((err, scans) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'jobs': scans });
        });
        // var jobIds = customerEquipment.jobs
        // Job.find({_id: {$in : jobIds }, company: companyId})
        // .populate({
        //     path: 'technician',
        //     select: 'profile.displayName'
        // })
        // .populate({
        //     path: 'customer',
        //     select: 'info.name'
        // })
        // .populate({
        //     path: 'type',
        //     select: 'title'
        // })
        // .populate({
        //     path: 'company',
        //     select: 'info.companyName'
        // })
        // .exec((err: any, companyJobs: IJob[])=>{
        //     if (err || !companyJobs) {
        //         return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //     }
        //     Job.find({_id: {$in : jobIds }, company:  { $ne: companyId }}, '_id comment dateTime',)
        //     .exec((err: any, nonCompanyJobs: IJob[])=>{
        //         if (err || !nonCompanyJobs) {
        //             return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //         }
        //         var allJobs = companyJobs.concat(nonCompanyJobs)
        //         allJobs.sort(function(a, b){
        //             var keyA = new Date(a.dateTime),
        //                 keyB = new Date(b.dateTime);
        //             // Compare the 2 dates
        //             if(keyA > keyB) return -1;
        //             if(keyA < keyB) return 1;
        //             return 0;
        //         });
        //         return res.json({ 'status': Status.Success, 'jobs': allJobs })
        //     })
        // })
    });
};
exports.linkJobToEquipment = (req, res) => {
    const params = req.body;
    const user = req.user;
    Job_1.Job.findById(params.jobId)
        .exec((err, job) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        CustomerEquipment_1.CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag, customer: job.customer })
            .exec((err, customerEquipment) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (customerEquipment == undefined || customerEquipment == null) {
                return res.json({ 'status': constants_1.Status.InvalidEquipment, 'message': "Invalid Customer Equipment" });
            }
            Scan_1.Scan.findOne({ equipmentId: customerEquipment._id, job: params.jobId }, (err, scan) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                if (scan != undefined && scan != null) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': "Equipment already scanned for this job." });
                }
                // create new scan
                const newScan = new Scan_1.Scan({
                    equipment: customerEquipment._id,
                    job: params.jobId,
                    comment: params.comment,
                    user: user._id,
                    timeOfScan: Date.now()
                });
                newScan.save((err) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    job.updateOne({ equipment_scanned: true })
                        .exec((err, raw) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        return res.json({ 'status': constants_1.Status.Success, 'message': 'Equipment scanned successfully.' });
                    });
                });
            });
        });
    });
};
exports.getCustomerEquipmentInfo = (req, res) => {
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag }, 'info.model info.serialNumber info.location images')
        .populate({
        path: 'type',
        select: 'title'
    })
        .populate({
        path: 'brand',
        select: 'title'
    })
        .populate({
        path: 'customer',
        select: 'profile.displayName address.street address.city address.state address.zipCode'
    })
        .exec((err, equipment) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'equipment': equipment });
    });
};
exports.getEquipmentJobs = (req, res) => {
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err, customerEquipment) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (customerEquipment == undefined || customerEquipment == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No equipment found. Please try again' });
        }
        Scan_1.Scan.find({ equipment: customerEquipment._id }, '_id')
            .populate({
            path: 'job',
            select: 'jobId description status dateTime',
            populate: [{ path: 'customer', select: 'profile.displayName' }],
        })
            .exec((err, scans) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'jobs': scans });
        });
    });
};
exports.checkTagAssociation = (req, res) => {
    const params = req.body;
    CustomerEquipment_1.CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err, equipment) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (equipment == undefined || equipment == null) {
            return res.json({ 'status': constants_1.Status.Success, 'tagStatus': constants_1.Status.TagNotAssociated, 'message': constants_1.Messages.TagNotAssociated });
        }
        return res.json({ 'status': constants_1.Status.Success, 'tagStatus': constants_1.Status.TagAssociated, 'message': constants_1.Messages.TagAssociated });
    });
};
//# sourceMappingURL=customerEquipment.js.map