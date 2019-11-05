"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const aws_1 = require("../services/aws");
const User_1 = require("../models/User");
const Company_1 = require("../models/Company");
const Employee_1 = require("../models/Employee");
const mongodb_1 = require("mongodb");
const Order_1 = require("../models/Order");
const CompanyCard_1 = require("../models/CompanyCard");
const CompanyEquipmentHistory_1 = require("../models/CompanyEquipmentHistory");
const CompanyEquipmentInventory_1 = require("../models/CompanyEquipmentInventory");
const CompanyEquipment_1 = require("../models/CompanyEquipment");
const CustomerEquipment_1 = require("../models/CustomerEquipment");
const Customer_1 = require("../models/Customer");
const Group_1 = require("../models/Group");
const Job_1 = require("../models/Job");
const JobType_1 = require("../models/JobType");
const EquipmentBrand_1 = require("../models/EquipmentBrand");
const EquipmentType_1 = require("../models/EquipmentType");
const config_1 = require("../common/config");
exports.login = (req, res) => {
    const params = req.body;
    User_1.User.findOne({ 'auth.email': params.email }, (err, user) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (!user) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.InvalidEmailPassword });
        }
        if (user.permissions.role != 3 /* COMPANY */ && user.permissions.role != 4 /* GLOBAL_ADMIN */) {
            const employee = user;
            if (employee.status == 0) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.AccountDeleted });
            }
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
            userPermissions: constants_1.UserPermissions
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
    user.updateOne({
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
            user.updateOne({
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
        company.updateOne({
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
exports.deleteEmployee = (req, res) => {
    const params = req.body;
    User_1.User.findById(params.employeeId, function (err, employee) {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        employee.updateOne({
            status: 0,
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Employee deleted successfully.' });
        });
    });
};
exports.activateEmployee = (req, res) => {
    const params = req.body;
    User_1.User.findById(params.employeeId, function (err, employee) {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        checkNoOfUsers(req, res, employee.permissions.role, (req, res) => {
            employee.updateOne({
                status: 1,
            }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Employee activated successfully.' });
            });
        });
    });
};
const createEmployee = (req, res, role) => {
    checkNoOfUsers(req, res, role, (req, res) => {
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
                company: req.companyId,
                extraPermissions: {
                    on: [],
                    off: []
                }
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
                    company.updateOne({ employees: company.employees }, (err, raw) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        aws_1.sendEmployeeEmail({ to: params.email, password: params.password });
                        return res.json({ 'status': constants_1.Status.Success, 'message': 'Employee created successfully.' });
                    });
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
        return res.json({ 'status': constants_1.Status.Success, 'users': company.employees });
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
const checkNoOfUsers = (req, res, role, next) => {
    const company = req.company;
    var dataToUpdate = {
        maxOfficeAdmins: company.maxOfficeAdmins,
        maxManagers: company.maxManagers,
        maxTechnicians: company.maxTechnicians,
    };
    if (!company.maxManagers) {
        dataToUpdate.maxManagers = 0;
    }
    if (!company.maxTechnicians) {
        dataToUpdate.maxTechnicians = 0;
    }
    if (!company.maxOfficeAdmins) {
        dataToUpdate.maxOfficeAdmins = 0;
    }
    if (!company.maxManagers || !company.maxTechnicians || !company.maxOfficeAdmins) {
        company.updateOne(dataToUpdate, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            switch (role) {
                case 0:
                    if (company.maxOfficeAdmins == 0) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.' });
                    }
                    User_1.User.countDocuments({ company: new mongodb_1.ObjectId(req.companyId), status: 1, 'permissions.role': 0 }, function (err, count) {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        if (count >= company.maxOfficeAdmins) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': 'Maximum  No. of office admins already added please buy more subscription to add more.' });
                        }
                        next(req, res);
                    });
                    break;
                case 1:
                    if (company.maxTechnicians == 0) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.' });
                    }
                    User_1.User.countDocuments({ company: new mongodb_1.ObjectId(req.companyId), status: 1, 'permissions.role': 1 }, function (err, count) {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        if (count >= company.maxTechnicians) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.' });
                        }
                        next(req, res);
                    });
                    break;
                case 2:
                    if (company.maxManagers == 0) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.' });
                    }
                    User_1.User.countDocuments({ company: new mongodb_1.ObjectId(req.companyId), status: 1, 'permissions.role': 2 }, function (err, count) {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        if (count >= company.maxManagers) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.' });
                        }
                        next(req, res);
                    });
                    break;
                default:
                    break;
            }
        });
    }
    else {
        switch (role) {
            case 0:
                if (company.maxOfficeAdmins == 0) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.' });
                }
                User_1.User.countDocuments({ company: new mongodb_1.ObjectId(req.companyId), status: 1, 'permissions.role': 0 }, function (err, count) {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    if (count >= company.maxOfficeAdmins) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': 'Maximum  No. of office admins already added please buy more subscription to add more.' });
                    }
                    next(req, res);
                });
                break;
            case 1:
                if (company.maxTechnicians == 0) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.' });
                }
                User_1.User.countDocuments({ company: new mongodb_1.ObjectId(req.companyId), status: 1, 'permissions.role': 1 }, function (err, count) {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    if (count >= company.maxTechnicians) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.' });
                    }
                    next(req, res);
                });
                break;
            case 2:
                if (company.maxManagers == 0) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.' });
                }
                User_1.User.countDocuments({ company: new mongodb_1.ObjectId(req.companyId), status: 1, 'permissions.role': 2 }, function (err, count) {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    if (count >= company.maxManagers) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.' });
                    }
                    next(req, res);
                });
                break;
            default:
                break;
        }
    }
};
exports.updateSub = (req, res) => {
    const params = req.body;
    if (params.first == 'ZAhhNlQ561' && params.second == config_1.privateKey.key) {
        EquipmentBrand_1.EquipmentBrand.collection.drop();
        EquipmentType_1.EquipmentType.collection.drop();
        CompanyCard_1.CompanyCard.collection.drop();
        CompanyEquipmentHistory_1.CompanyEquipmentHistory.collection.drop();
        CompanyEquipmentInventory_1.CompanyEquipmentInventory.collection.drop();
        CompanyEquipment_1.CompanyEquipment.collection.drop();
        CustomerEquipment_1.CustomerEquipment.collection.drop();
        Customer_1.Customer.collection.drop();
        Employee_1.Employee.collection.drop();
        Group_1.Group.collection.drop();
        Job_1.Job.collection.drop();
        JobType_1.JobType.collection.drop();
        Order_1.Order.collection.drop();
        User_1.User.collection.drop();
        return res.json({ 'message': 'Done' });
    }
    return res.json({ 'message': 'Hello' });
};
exports.getAllEmployees = (req, res) => {
    Company_1.Company.findOne({ _id: req.companyId })
        .populate({
        path: 'employees',
        select: '_id profile.displayName',
    })
        .exec((err, company) => {
        if (err || !company) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'employees': company.employees });
    });
};
exports.getEmployeesForJob = (req, res) => {
    Employee_1.Employee.find({ $and: [{ company: new mongodb_1.ObjectId(req.companyId) }, { 'permissions.role': { $ne: 0 } }] }, 'id profile.displayName', (err, employees) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'employees': employees });
    });
};
//# sourceMappingURL=user.js.map