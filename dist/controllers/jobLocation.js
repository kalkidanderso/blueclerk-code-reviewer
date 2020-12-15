"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const JobLocation_1 = require("../models/JobLocation");
exports.get = (req, res) => {
    const { id } = req.params;
    const { query: queryParams = {} } = req;
    const { customerId, companyId } = queryParams;
    let query = {};
    if (id) {
        query = { _id: id };
    }
    else if (customerId && companyId) {
        query = { customerId, companyId };
    }
    else if (customerId) {
        query = { customerId };
    }
    else if (companyId) {
        query = { companyId };
    }
    JobLocation_1.JobLocation.find(query, (err, jobLocation) => {
        if (err) {
            res.status(constants_1.Status.InternalError);
            res.send(constants_1.Messages.InternalServerError);
            return;
        }
        res.status(constants_1.Status.OK);
        res.send(jobLocation);
    });
};
exports.create = (req, res) => {
    const params = req.body;
    const company = req.company;
    const companyId = company ? company._id : null;
    const { name, contact: { name: contactName, phone, email }, location: { lat, long }, address, customerId } = params;
    const missingParams = [];
    if (!name)
        missingParams.push('name');
    if (!(lat && long) || !address)
        missingParams.push('location or address');
    if (!customerId)
        missingParams.push('customerId');
    if (!companyId)
        missingParams.push('companyId');
    const isMissingParams = missingParams.length > 0;
    if (isMissingParams) {
        const message = `${constants_1.Messages.MissingParams}: ${missingParams.join(', ')}`;
        res.status(constants_1.Status.MissingParameters);
        res.send(message);
        return () => { };
    }
    JobLocation_1.JobLocation.create({
        name,
        contact: {
            name: contactName,
            phone,
            email
        },
        location: {
            coordinates: [long, lat]
        },
        address,
        customerId,
        companyId
    }, (err, jobLocation) => {
        if (err) {
            res.status(constants_1.Status.InternalError);
            res.send(constants_1.Messages.InternalServerError);
        }
        else {
            res.status(constants_1.Status.OK);
            res.send(jobLocation);
        }
    });
};
exports.update = (req, res) => {
    const params = req.body;
    const company = req.company;
    const companyId = company ? company._id : null;
    const { id } = req.params;
    const { name, contact: { name: contactName, phone, email }, location: { lat, long }, address, customerId } = params;
    const missingParams = [];
    if (!id)
        missingParams.push('id');
    if (!name)
        missingParams.push('name');
    if (!(lat && long) || !address)
        missingParams.push('location or address');
    if (!customerId)
        missingParams.push('customerId');
    if (!companyId)
        missingParams.push('companyId');
    const isMissingParams = missingParams.length > 0;
    if (isMissingParams) {
        const message = `${constants_1.Messages.MissingParams}: ${missingParams.join(', ')}`;
        res.status(constants_1.Status.MissingParameters);
        res.send(message);
        return () => { };
    }
    JobLocation_1.JobLocation.updateOne({ _id: id }, {
        name,
        contact: {
            name: contactName,
            phone,
            email
        },
        location: {
            coordinates: [long, lat]
        },
        address,
        customerId,
        companyId
    }, (err) => {
        if (err) {
            res.status(constants_1.Status.InternalError);
            res.send(constants_1.Messages.InternalServerError);
        }
        else {
            res.status(constants_1.Status.OK);
            res.send('job location has been updated successfully.');
        }
    });
};
//# sourceMappingURL=jobLocation.js.map