"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const aws_1 = __importDefault(require("../services/aws"));
const User_1 = require("../models/User");
const Subscriber_1 = require("../models/Subscriber");
const NonSubscriber_1 = require("../models/NonSubscriber");
exports.login = (req, res) => {
    const params = req.body;
    User_1.User.findOne({ 'auth.email': params.email }, (err, user) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (!user) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.InvalidEmailPassword });
        }
        user.comparePassword(params.password, (isMatching) => {
            if (!isMatching) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.InvalidEmailPassword });
            }
            res.json({ 'status': constants_1.Status.Success, 'user': user, 'token': user.jwt() });
        });
    });
};
exports.createGlobalAdmin = (req, res) => {
    checkEmailExists(req, res, (req, res) => {
        const params = req.body;
        const user = new User_1.User({
            auth: {
                email: params.email,
                password: params.password,
            },
            profile: {
                firstName: params.firstName,
                lastName: params.lastName,
                displayName: params.displayName,
            },
            address: {
                street: params.street,
                city: params.city,
                state: params.state,
                zipCode: params.zipCode,
            },
            contact: {
                phone: params.phone,
            },
            permissions: {
                role: 0 /* GLOBAL_ADMIN */,
                extra: [],
            },
        });
        user.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            exports.login(req, res);
        });
    });
};
exports.createSubscriber = (req, res) => {
    checkEmailExists(req, res, (req, res) => {
        const params = req.body;
        const subscriber = new Subscriber_1.Subscriber({
            auth: {
                email: params.email,
                password: params.password,
            },
            profile: {
                firstName: params.firstName,
                lastName: params.lastName,
                displayName: params.displayName,
            },
            address: {
                street: params.street,
                city: params.city,
                state: params.state,
                zipCode: params.zipCode,
            },
            contact: {
                phone: params.phone,
            },
            permissions: {
                role: 1 /* SUBSCRIBER */,
                extra: [],
            },
            company: {
                companyName: params.companyName,
                industry: params.industry,
            },
        });
        subscriber.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            aws_1.default({ to: params.email });
            exports.login(req, res);
        });
    });
};
exports.createManager = (req, res) => {
    createNonSubscriber(req, res, 2 /* MANAGER */);
};
exports.createTechnician = (req, res) => {
    createNonSubscriber(req, res, 3 /* TECHNICIAN */);
};
exports.createOfficeAdmin = (req, res) => {
    createNonSubscriber(req, res, 4 /* OFFICE_ADMIN */);
};
exports.getManagersList = (req, res) => {
    getNonSubscribersList(req, res, 2 /* MANAGER */);
};
exports.getTechniciansList = (req, res) => {
    getNonSubscribersList(req, res, 3 /* TECHNICIAN */);
};
exports.getOfficeAdminsList = (req, res) => {
    getNonSubscribersList(req, res, 4 /* OFFICE_ADMIN */);
};
const createNonSubscriber = (req, res, role) => {
    checkEmailExists(req, res, (req, res) => {
        const params = req.body;
        const subscriber = req.user;
        const nonSubscriber = new NonSubscriber_1.NonSubscriber({
            auth: {
                email: params.email,
                password: params.password,
            },
            profile: {
                firstName: params.firstName,
                lastName: params.lastName,
                displayName: params.displayName,
            },
            address: {
                street: params.street,
                city: params.city,
                state: params.state,
                zipCode: params.zipCode,
            },
            contact: {
                phone: params.phone,
            },
            permissions: {
                role: role,
                extra: [],
            },
            subscriber: subscriber._id
        });
        nonSubscriber.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            subscriber.users.push(nonSubscriber._id);
            subscriber.update({ users: subscriber.users }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'User created successfully.' });
            });
        });
    });
};
const getNonSubscribersList = (req, res, role) => {
    const user = req.user;
    User_1.User.findOne({ _id: user._id })
        .populate({
        path: 'users',
        match: { 'permissions.role': { $eq: role } },
    })
        .exec((err, subscriber) => {
        if (err || !subscriber) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'users': subscriber.users });
    });
};
const checkEmailExists = (req, res, next) => {
    const params = req.body;
    User_1.User.findOne({ 'auth.email': params.email }, (err, user) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (user) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.DuplicateEmail });
        }
        next(req, res);
    });
};
//# sourceMappingURL=user.js.map