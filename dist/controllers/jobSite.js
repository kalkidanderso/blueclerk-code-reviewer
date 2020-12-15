"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const JobSite_1 = require("../models/JobSite");
const JobLocation_1 = require("../models/JobLocation");
exports.get = (req, res) => {
    const { id } = req.params;
    const { query: queryParams = {} } = req;
    const { customerId, locationId } = queryParams;
    let query = {};
    if (id) {
        query = { _id: id };
    }
    else if (customerId && locationId) {
        query = { customerId, locationId };
    }
    else if (customerId) {
        query = { customerId };
    }
    else if (locationId) {
        query = { locationId };
    }
    JobSite_1.JobSite.find(query, (err, jobSite) => {
        if (err) {
            res.status(constants_1.Status.InternalError);
            res.send(constants_1.Messages.InternalServerError);
            return;
        }
        res.status(constants_1.Status.OK);
        res.send(jobSite);
    });
};
exports.create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const params = req.body || {};
    const { name, location: { lat, long }, address, locationId } = params;
    const missingParams = [];
    if (!(lat && long) || !address)
        missingParams.push('location or address');
    if (!locationId)
        missingParams.push('locationId');
    const isMissingParams = missingParams.length > 0;
    if (isMissingParams) {
        const message = `${constants_1.Messages.MissingParams}: ${missingParams.join(', ')}`;
        res.status(constants_1.Status.MissingParameters);
        res.send(message);
        return () => { };
    }
    let jobLocation = null;
    try {
        jobLocation = yield JobLocation_1.JobLocation.findById(locationId, 'customerId');
        if (jobLocation == null) {
            res.status(constants_1.Status.MissingParameters);
            res.send('No location was found for provided locationId');
        }
    }
    catch (err) {
        res.status(constants_1.Status.InternalError);
        res.send(constants_1.Messages.InternalServerError);
    }
    if (!jobLocation)
        return;
    const { customerId = null } = jobLocation || {};
    JobSite_1.JobSite.create({
        name,
        location: {
            coordinates: [long, lat]
        },
        address,
        locationId,
        customerId
    }, (err, jobSite) => {
        if (err) {
            res.status(constants_1.Status.InternalError);
            res.send(constants_1.Messages.InternalServerError);
        }
        else {
            res.status(constants_1.Status.OK);
            res.send(jobSite);
        }
    });
});
exports.update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const params = req.body;
    const { id } = req.params;
    const { name, location: { lat, long }, address, locationId } = params;
    const missingParams = [];
    if (!id)
        missingParams.push('id');
    if (!(lat && long) || !address)
        missingParams.push('location or address');
    if (!locationId)
        missingParams.push('locationId');
    const isMissingParams = missingParams.length > 0;
    if (isMissingParams) {
        const message = `${constants_1.Messages.MissingParams}: ${missingParams.join(', ')}`;
        res.status(constants_1.Status.MissingParameters);
        res.send(message);
        return () => { };
    }
    let jobLocation = null;
    try {
        jobLocation = yield JobLocation_1.JobLocation.findById(locationId, 'customerId');
        if (jobLocation == null) {
            res.status(constants_1.Status.MissingParameters);
            res.send('No location was found for provided locationId');
        }
    }
    catch (err) {
        res.status(constants_1.Status.InternalError);
        res.send(constants_1.Messages.InternalServerError);
    }
    if (!jobLocation)
        return;
    const { customerId = null } = jobLocation || {};
    JobSite_1.JobSite.updateOne({ _id: id }, {
        name,
        location: {
            coordinates: [long, lat]
        },
        address,
        locationId,
        customerId
    }, (err) => {
        if (err) {
            res.status(constants_1.Status.InternalError);
            res.send(constants_1.Messages.InternalServerError);
        }
        else {
            res.status(constants_1.Status.OK);
            res.send('Job Site has been updated successfully.');
        }
    });
});
//# sourceMappingURL=jobSite.js.map