"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const aws_1 = require("../services/aws");
const User_1 = require("../models/User");
const Company_1 = require("../models/Company");
const Employee_1 = require("../models/Employee");
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
                displayName: `${params.firstName} ${params.lastName}`,
                imageUrl: '',
            },
            address: {
                street: '',
                city: '',
                state: '',
                zipCode: '',
            },
            contact: {
                phone: params.phone,
            },
            permissions: {
                role: 4 /* GLOBAL_ADMIN */,
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
exports.createCompany = (req, res) => {
    checkEmailExists(req, res, (req, res) => {
        const params = req.body;
        const company = new Company_1.Company({
            auth: {
                email: params.email,
                password: params.password,
            },
            profile: {
                firstName: params.firstName,
                lastName: params.lastName,
                displayName: `${params.firstName} ${params.lastName}`,
                imageUrl: '',
            },
            address: {
                street: '',
                city: '',
                state: '',
                zipCode: '',
            },
            contact: {
                phone: params.phone,
            },
            permissions: {
                role: 3 /* COMPANY */,
                extra: [],
            },
            info: {
                companyName: params.companyName,
                industry: params.industryId,
                logoUrl: '',
            },
        });
        company.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            aws_1.sendEmail({ to: params.email });
            exports.login(req, res);
        });
    });
};
exports.createManager = (req, res) => {
    createEmployee(req, res, 2 /* MANAGER */);
};
exports.createTechnician = (req, res) => {
    createEmployee(req, res, 1 /* TECHNICIAN */);
};
exports.createOfficeAdmin = (req, res) => {
    createEmployee(req, res, 0 /* OFFICE_ADMIN */);
};
exports.getManagersList = (req, res) => {
    getEmployeesList(req, res, 2 /* MANAGER */);
};
exports.getTechniciansList = (req, res) => {
    getEmployeesList(req, res, 1 /* TECHNICIAN */);
};
exports.getOfficeAdminsList = (req, res) => {
    getEmployeesList(req, res, 0 /* OFFICE_ADMIN */);
};
exports.updateProfile = (req, res) => {
    const params = req.body;
    const user = req.user;
    user.update({
        'profile.firstName': params.firstName,
        'profile.lastName': params.lastName,
        'profile.imageUrl': params.imageUrl,
        'profile.displayName': `${params.firstName} ${params.lastName}`,
    }, (err, raw) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Profile updated successfully.' });
    });
};
exports.changePassword = (req, res) => {
    const params = req.body;
    const user = req.user;
    user.comparePassword(params.currentPassword, (isMatching) => {
        if (!isMatching) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Current password doesn\'t match.' });
        }
        user.hashPassword(params.newPassword, (err, hash) => {
            if (err || !hash) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            user.update({
                'auth.password': hash,
            }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Password changed successfully.' });
            });
        });
    });
};
exports.updateCompanyProfile = (req, res) => {
    const params = req.body;
    Company_1.Company.findById(req.companyId, function (err, company) {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        company.update({
            'info.companyName': params.companyName,
            'info.logoUrl': params.logoUrl,
            'address.street': params.street,
            'address.city': params.city,
            'address.state': params.state,
            'address.zipCode': params.zipCode,
            'contact.phone': params.phone,
            'contact.fax': params.fax,
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Profile updated successfully.' });
        });
    });
};
const createEmployee = (req, res, role) => {
    checkEmailExists(req, res, (req, res) => {
        const params = req.body;
        const employee = new Employee_1.Employee({
            auth: {
                email: params.email,
                password: params.password,
            },
            profile: {
                firstName: params.firstName,
                lastName: params.lastName,
                displayName: `${params.firstName} ${params.lastName}`,
                imageUrl: '',
            },
            address: {
                street: '',
                city: '',
                state: '',
                zipCode: '',
            },
            contact: {
                phone: params.phone,
            },
            permissions: {
                role: role,
                extra: [],
            },
            company: req.companyId
        });
        employee.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            Company_1.Company.findById(req.companyId, function (err, company) {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                company.employees.push(employee._id);
                company.update({ employees: company.employees }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Employee created successfully.' });
                });
            });
        });
    });
};
const getEmployeesList = (req, res, role) => {
    Company_1.Company.findOne({ _id: req.companyId })
        .populate({
        path: 'employees',
        match: { 'permissions.role': { $eq: role } },
    })
        .exec((err, company) => {
        if (err || !company) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'users': company.employees });
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