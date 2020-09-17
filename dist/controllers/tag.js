"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Tag_1 = require("../models/Tag");
const Scan_1 = require("../models/Scan");
exports.codeLocationTag = (req, res) => {
    const params = req.body;
    const user = req.user;
    Tag_1.Tag.findOne({ 'info.nfcTag': params.nfcTag }, (err, oldTag) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (oldTag != undefined || oldTag != null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Tag is already code." });
        }
        var tag = new Tag_1.Tag({
            'info.nfcTag': params.nfcTag,
            latitude: params.latitude,
            longitude: params.longitude,
            note: params.note,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now()
        });
        tag.save((err, tag) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Tag coded successfully." });
        });
    });
};
exports.updateLocationTag = (req, res) => {
    const params = req.body;
    Tag_1.Tag.findOne({ 'info.nfcTag': params.nfcTag, 'company': req.companyId }, (err, tag) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (tag == undefined || tag == null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Invalid tag id." });
        }
        tag.updateOne({ latitude: params.latitude, longitude: params.longitude, note: params.note }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Tag updated successfully." });
        });
    });
};
exports.getLocationTags = (req, res) => {
    Tag_1.Tag.find({ 'company': req.companyId }, (err, tags) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'tags': tags });
    });
};
exports.getLocationTagJobs = (req, res) => {
    const params = req.body;
    Tag_1.Tag.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err, tag) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (tag == undefined || tag == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No tag found. Please try again' });
        }
        Scan_1.Scan.find({ tag: tag._id }, '_id')
            .populate({
            path: 'job',
            populate: [{ path: 'customer', select: 'profile.displayName' }, { path: 'type', select: 'title' }],
        })
            .exec((err, scans) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'jobs': scans });
        });
    });
};
//# sourceMappingURL=tag.js.map