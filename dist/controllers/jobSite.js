"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const JobSite_1 = require("../models/JobSite");
exports.get = (req, res) => {
    const { query: queryParams } = req;
    const { customerId, companyId } = queryParams;
    let query = {};
    if (customerId && companyId) {
        query = { customerId, companyId };
    }
    else if (customerId) {
        query = { customerId };
    }
    else if (companyId) {
        query = { companyId };
    }
    JobSite_1.JobSite.find(query, (err, jobSites) => {
        if (err) {
            res.status(constants_1.Status.InternalError);
            res.send(constants_1.Messages.InternalServerError);
            return;
        }
        res.status(constants_1.Status.OK);
        res.send(jobSites);
    });
};
exports.create = (req, res) => {
    console.log('begin create');
    saveDocument(req, res)(JobSite_1.JobSite.create, JobSite_1.JobSite);
    console.log('end create');
};
exports.update = (req, res) => {
    saveDocument(req, res)(JobSite_1.JobSite.updateOne, JobSite_1.JobSite);
};
function saveDocument(req, res) {
    console.log('in save document');
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
    return (documentMethod, context) => {
        console.log('in curried function');
        documentMethod.call(context, {
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
    };
}
//# sourceMappingURL=jobSite.js.map