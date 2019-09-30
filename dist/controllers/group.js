"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Group_1 = require("../models/Group");
exports.createGroup = (req, res) => {
    const params = req.body;
    const group = new Group_1.Group({
        title: params.title,
        company: req.companyId,
    });
    group.save((err) => {
        if (err) {
            console.log(err);
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Group created successfully.' });
    });
};
exports.getGroups = (req, res) => {
    Group_1.Group.find({ company: req.companyId })
        .populate({
        path: 'manager',
    })
        .populate({
        path: 'members',
    })
        .exec((err, groups) => {
        if (err || !groups) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'groups': groups });
    });
};
exports.deleteGroup = (req, res) => {
    const params = req.body;
    const user = req.user;
    var companyId = user._id;
    Group_1.Group.findOne({ _id: params.groupId, company: companyId })
        .exec((err, group) => {
        if (!err && !group) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid groupId.' });
        }
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        Group_1.Group.deleteOne({ _id: group._id })
            .exec((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Group deleted successfully.' });
        });
    });
};
exports.addManager = (req, res) => {
    const params = req.body;
    Group_1.Group.findOne({ _id: params.groupId, company: req.companyId })
        .exec((err, group) => {
        if (err || !group) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        group.update({ manager: params.managerId }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Manager added to group successfully.' });
        });
    });
};
exports.addMember = (req, res) => {
    const params = req.body;
    Group_1.Group.findOne({ _id: params.groupId, company: req.companyId })
        .exec((err, group) => {
        if (err || !group) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (group.members.indexOf(params.memberId) !== -1) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Member already exist in group.' });
        }
        group.members.push(params.memberId);
        group.update({ members: group.members }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Member added to group successfully.' });
        });
    });
};
exports.removeMember = (req, res) => {
    const params = req.body;
    Group_1.Group.findOne({ _id: params.groupId, company: req.companyId })
        .exec((err, group) => {
        if (err || !group) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        var index = group.members.indexOf(params.memberId);
        if (index === -1) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Member already removed from group.' });
        }
        group.members.splice(index, 1);
        group.update({ members: group.members }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Member removed from group successfully.' });
        });
    });
};
//# sourceMappingURL=group.js.map