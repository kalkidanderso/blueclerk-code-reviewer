"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Industry_1 = require("../models/Industry");
exports.createIndustry = (req, res) => {
    const params = req.body;
    const user = req.user;
    Industry_1.Industry.findOne({ title: params.title }, (err, previousIndustry) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (previousIndustry != undefined || previousIndustry != null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Industry already created" });
        }
        const industry = new Industry_1.Industry({
            title: params.title,
            createdBy: user._id
        });
        industry.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Industry created successfully.' });
        });
    });
};
exports.getIndustries = (req, res) => {
    Industry_1.Industry.find((err, industries) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'industries': industries });
    });
};
exports.removeIndustry = (req, res) => {
    const params = req.body;
    Industry_1.Industry.findOneAndDelete({ _id: params.industryId })
        .exec((err, industry) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Industry removed successfully.' });
    });
};
//# sourceMappingURL=industry.js.map