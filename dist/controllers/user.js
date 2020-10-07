"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const aws_1 = require("../services/aws");
const User_1 = require("../models/User");
const Company_1 = require("../models/Company");
const Employee_1 = require("../models/Employee");
const mongodb_1 = require("mongodb");
// import { Order } from '../models/Order'
const CompanyCard_1 = require("../models/CompanyCard");
// import { CompanyEquipmentHistory } from '../models/CompanyEquipmentHistory'
// import { CompanyEquipmentInventory } from '../models/CompanyEquipmentInventory'
// import { CompanyEquipment } from '../models/CompanyEquipment'
// import { CustomerEquipment } from '../models/CustomerEquipment'
// import { Customer } from '../models/Customer'
// import { Group } from '../models/Group'
// import { Job } from '../models/Job'
// import { JobType } from '../models/JobType'
// import { EquipmentBrand } from '../models/EquipmentBrand'
// import { EquipmentType } from '../models/EquipmentType'
// import { privateKey } from '../common/config'
const Contract_1 = require("../models/Contract");
const CompanyCustomer_1 = require("../models/CompanyCustomer");
const CompanyAdmin_1 = require("../models/CompanyAdmin");
// import { CompanyPrefix, ICompanyPrefix } from '../models/CompanyPrefix'
// import { Scan } from '../models/Scan'
// import { ServiceTicket } from '../models/ServiceTicket'
// import { Industry } from '../models/Industry'
var generator = require('generate-password');
var passwordValidator = require('password-validator');
const stripe_1 = require("../services/stripe");
const Industry_1 = require("../models/Industry");
const Hubspot = require('hubspot');
exports.login = (req, res) => {
    const params = req.body;
    User_1.User.findOne({ 'auth.email': params.email }, (err, user) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (!user) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.InvalidEmailPassword });
        }
        if (user.permissions.role != 3 /* COMPANY_ADMIN */ && user.permissions.role != 4 /* GLOBAL_ADMIN */) {
            const employee = user;
            Company_1.Company.findById(employee.company, (err, company) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                if (company.paid == false && new Date() > company.chargeDate) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'You can\'t login please contact your Company.' });
                }
                if (employee.status == 0) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.AccountDeleted });
                }
                user.comparePassword(params.password, (isMatching) => {
                    if (!isMatching) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.InvalidEmailPassword });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'user': user, 'token': user.jwt() });
                });
            });
        }
        else if (user.permissions.role != 4 /* GLOBAL_ADMIN */) {
            user.comparePassword(params.password, (isMatching) => {
                if (!isMatching) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.InvalidEmailPassword });
                }
                const admin = user;
                Company_1.Company.findById(admin.company, (err, company) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    company.userPermissions = undefined;
                    company.employees = undefined;
                    company.customers = undefined;
                    company.paid = undefined;
                    company.type = undefined;
                    company.maxTechnicians = undefined;
                    company.maxManagers = undefined;
                    company.maxOfficeAdmins = undefined;
                    company.qbAccessToken = undefined;
                    company.qbRefreshToken = undefined;
                    company.socketId = undefined;
                    company.realmId = undefined;
                    return res.json({ 'status': constants_1.Status.Success, 'user': user, 'company': company, 'token': user.jwt() });
                });
            });
        }
        else {
            user.comparePassword(params.password, (isMatching) => {
                if (!isMatching) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.InvalidEmailPassword });
                }
                return res.json({ 'status': constants_1.Status.Success, 'user': user, 'token': user.jwt() });
            });
        }
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
    checkCompanyEmailExists(req, res, (req, res) => {
        const params = req.body;
        var chargeDate = new Date();
        chargeDate.setDate(chargeDate.getDate() + 30);
        const company = new Company_1.Company({
            info: {
                companyName: params.companyName,
                industry: params.industryId,
                logoUrl: '',
                companyEmail: params.email,
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
            userPermissions: constants_1.UserPermissions,
            chargeDate: chargeDate,
            maxTechnicians: 2,
            maxManagers: 1,
            maxOfficeAdmins: 1
        });
        company.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            const companyAdmin = new CompanyAdmin_1.CompanyAdmin({
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
                    role: 3 /* COMPANY_ADMIN */,
                    extra: [],
                },
                company: company._id
            });
            companyAdmin.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                company.updateOne({
                    'admin': companyAdmin._id
                }, (err, raq) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    _createHubSpotContact(company, companyAdmin);
                    aws_1.sendEmail({ to: params.email });
                    exports.login(req, res);
                });
            });
        });
    });
};
const _createHubSpotContact = (company, companyAdmin) => {
    const hubspot = new Hubspot({
        apiKey: '163d5d65-83c0-4d5f-9dcf-55b052f9ef4d'
    });
    Industry_1.Industry.findById(company.info.industry).exec((err, industry) => {
        const contactObj = {
            "properties": [
                { "property": 'email', "value": company.info.companyEmail },
                { "property": 'firstname', "value": companyAdmin.profile.firstName },
                { "property": 'lastname', "value": companyAdmin.profile.lastName },
                { "property": 'company', "value": company.info.companyName },
                { "property": 'phone', "value": company.contact.phone },
                { "property": 'industry', "value": industry.title },
                { "property": 'lifecyclestage', "value": 'customer' },
                { "property": 'customer_type', "value": 'Free' },
            ]
        };
        hubspot.contacts.create(contactObj);
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
        'address.street': params.street,
        'address.city': params.city,
        'address.state': params.state,
        'address.zipCode': params.zipCode,
        'contact.phone': params.phone,
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
exports.fogotPassword = (req, res) => {
    const params = req.body;
    User_1.User.findOne({ 'auth.email': params.email }, (err, user) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (user == undefined || user == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid email address." });
        }
        var password = generator.generate({
            length: 8,
            numbers: true,
            uppercase: true,
            excludeSimilarCharacters: true,
            strict: true
        });
        user.hashPassword(password, (err, hash) => {
            user.updateOne({ 'auth.password': hash }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                aws_1.sendPasswordEmail({ to: params.email, name: user.profile.displayName, password: password });
                return res.json({ 'status': constants_1.Status.Error, 'message': "Email sent." });
            });
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
            const roles = ['OfficeAdmin', 'Technician', 'Manager'];
            var password = generator.generate({
                length: 8,
                numbers: true,
                uppercase: true,
                excludeSimilarCharacters: true,
                strict: true
            });
            // password = 123456
            const employee = new Employee_1.Employee({
                auth: {
                    email: params.email,
                    password: password,
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
                        aws_1.sendEmployeeEmail({ to: params.email, company: company.info.companyName, role: roles[employee.permissions.role], password: password });
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
    var schema = new passwordValidator();
    schema
        .is().min(8) // Minimum length 8
        .is().max(30) // Maximum length 100
        .has().uppercase() // Must have uppercase letters
        .has().lowercase() // Must have lowercase letters
        .has().digits() // Must have digits
        .has().not().spaces() // Should not have spaces
        .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values
    // Validate against a password string
    if (params.password && !schema.validate(params.password)) {
        return res.json({ 'status': constants_1.Status.Error, 'message': "Your passsword is weak choose strong." });
    }
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
const checkCompanyEmailExists = (req, res, next) => {
    const params = req.body;
    Company_1.Company.findOne({ 'info.companyEmail': params.email }, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (company) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.CompanyDuplicateEmail });
        }
        User_1.User.findOne({ 'auth.email': params.email }, (err, user) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (user) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.DuplicateEmail });
            }
            next(req, res);
        });
    });
};
const checkNoOfUsers = (req, res, role, next) => {
    const company = req.company;
    if (company.paid == false && new Date() > company.chargeDate) {
        return res.json({ 'status': constants_1.Status.Error, 'message': 'You can\'t create users contact blueclerk admin for details.' });
    }
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
// export const updateSub = (req: Request, res: Response) => {
//     const params = req.body
//     if (params.first == 'ZAhhNlQ561' && params.second == privateKey.key) {
//         EquipmentBrand.collection.drop()
//         EquipmentType.collection.drop()
//         CompanyCard.collection.drop()
//         CompanyEquipmentHistory.collection.drop()
//         CompanyEquipmentInventory.collection.drop()
//         CompanyEquipment.collection.drop()
//         CustomerEquipment.collection.drop()
//         Customer.collection.drop()
//         Employee.collection.drop()
//         Group.collection.drop()
//         Job.collection.drop()
//         JobType.collection.drop()
//         Industry.collection.drop()
//         Order.collection.drop()
//         User.collection.drop()
//         CompanyCustomer.collection.drop()
//         CompanyAdmin.collection.drop()
//         Contract.collection.drop()
//         Scan.collection.drop()
//         ServiceTicket.collection.drop()
//         return res.json({ 'message': 'Done' })
//     }
//     return res.json({ 'message': 'Hello' })
// }
// new contractor signup
exports.createContractor = (req, res) => {
    checkCompanyEmailExists(req, res, (req, res) => {
        const params = req.body;
        const company = new Company_1.Company({
            info: {
                companyName: params.companyName,
                industry: params.industryId,
                logoUrl: '',
                companyEmail: params.email,
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
            auth: {
                email: params.email,
                password: params.password,
            },
            type: 1,
            userPermissions: constants_1.UserPermissions
        });
        company.save((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            const companyAdmin = new CompanyAdmin_1.CompanyAdmin({
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
                    role: 3 /* COMPANY_ADMIN */,
                    extra: [],
                },
                company: company._id
            });
            companyAdmin.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                company.updateOne({
                    'admin': companyAdmin._id
                }, (err, raq) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    _createHubSpotContact(company, companyAdmin);
                    aws_1.sendEmail({ to: params.email });
                    exports.login(req, res);
                });
            });
        });
    });
};
// search contractor/organization for contract
exports.searchContractor = (req, res) => {
    const params = req.body;
    Company_1.Company.find({ 'info.companyEmail': params.email }, 'info.companyEmail info.companyName contact.phone info.logoUrl address.street address.city address.state address.zipCode', (err, contractors) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (contractors.length == 0) {
            return res.json({ 'status': constants_1.Status.Success, 'contractors': [] });
        }
        return res.json({ 'status': constants_1.Status.Success, 'contractors': contractors });
    });
};
// company start / initiate contract for contractor
exports.startContract = (req, res) => {
    const params = req.body;
    const user = req.user;
    Company_1.Company.findById(params.contractorId, (err, contractor) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (contractor == undefined || contractor == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid vendor.' });
        }
        // check if contract already started
        Contract_1.Contract.findOne({ 'company': req.companyId, 'contractor': contractor._id }, (err, oldcontract) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (oldcontract != undefined && oldcontract != null) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Vendor already exist.' });
            }
            const contract = new Contract_1.Contract({
                company: req.companyId,
                contractor: contractor._id,
                status: 0 /* PENDING */,
            });
            contract.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                // ToDo send email to contractor for contract started
                aws_1.sendContractStartEmail({ to: contractor.info.companyEmail, company: req.company.info.companyName, contractor: contractor.info.companyName });
                aws_1.sendContractStartEmailToCompany({ to: req.company.info.companyEmail, company: req.company.info.companyName, contractor: contractor.info.companyName });
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Vendor Added.' });
            });
        });
    });
};
//invite contractor for signup
exports.inviteContractor = (req, res) => {
    const params = req.body;
    const user = req.user;
    Company_1.Company.findOne({ 'info.companyEmail': params.email }, (err, contractor) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (contractor != undefined && contractor != null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Email already taken.' });
        }
        // ToDo email email with singup link
        aws_1.sendInvitationToContractor({ to: params.email, company: req.company.info.companyName });
        return res.json({ 'status': constants_1.Status.Error, 'message': 'Invitation sent.' });
    });
};
// get all contracts for contractor
exports.getAllContracts = (req, res) => {
    const user = req.user;
    Contract_1.Contract.find({ contractor: user.company })
        .populate({
        path: 'company',
        select: 'info.companyName info.companyEmail type'
    })
        .populate({
        path: 'contractor',
        select: 'info.companyName info.companyEmail type'
    })
        .exec((err, contracts) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (contracts.length == 0 || contracts == undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No contract found.' });
        }
        res.json({ 'status': constants_1.Status.Success, 'contracts': contracts });
    });
};
// contract accept or reject by contractor /organization
exports.acceptRejectContract = (req, res) => {
    const params = req.body;
    const contractor = req.company;
    var contractStatus = 0;
    if (params.status == 'accept') {
        contractStatus = 1 /* ACCEPTED */;
    }
    else if (params.status == 'reject') {
        contractStatus = 3 /* REJECTED */;
    }
    else {
        return res.json({ 'status': constants_1.Status.Error, 'message': 'Invald contract status' });
    }
    Contract_1.Contract.findOne({ _id: params.contractId, contractor: contractor._id }, (err, contract) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (contract == undefined || contract == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid contract.' });
        }
        if (contract.status == 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Contract is already canceled.' });
        }
        if (contract.status == 3 /* REJECTED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Contract is already rejected.' });
        }
        if (contract.status == 4 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Contract is already finished.' });
        }
        contract.updateOne({ status: contractStatus }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            // ToDo send email to company /contractor on update
            Company_1.Company.findById(contract.company, (err, company) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                const companyCustomer = new CompanyCustomer_1.CompanyCustomer({
                    company: contractor._id,
                    customer: company._id,
                });
                companyCustomer.save((err) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    aws_1.sendContractStatusChangeEmailToCompany({ to: company.info.companyEmail, contractor: contractor.info.companyName, company: company.info.companyName, contractStatus: params.status + 'ed' });
                    aws_1.sendContractStatusChangeEmailToContractor({ to: contractor.info.companyEmail, contractor: contractor.info.companyName, company: company.info.companyName, contractStatus: params.status + 'ed' });
                    var amount = 0;
                    const now = new Date();
                    const daysRemaining = now.getDate();
                    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    const daysToCharge = daysInCurrentMonth - daysRemaining + 1;
                    const perday = 2 / daysInCurrentMonth;
                    amount = amount + (perday * daysToCharge);
                    if (company.stripeId != undefined || company.stripeId != '') {
                        stripe_1.chargeSubscription(amount, company.stripeId, (status, charge, message) => {
                            return res.json({ 'status': constants_1.Status.Success, 'message': 'Contract ' + params.status + 'ed.' });
                        });
                    }
                    else {
                        return res.json({ 'status': constants_1.Status.Success, 'message': 'Contract ' + params.status + 'ed.' });
                    }
                });
            });
        });
    });
};
// cancel or finish by compnay
exports.cancelOrFinishContract = (req, res) => {
    const params = req.body;
    const company = req.company;
    var contractStatus = 0;
    if (params.status == 'cancel') {
        contractStatus = 2 /* CANCELED */;
    }
    else if (params.status == 'finish') {
        contractStatus = 4 /* FINISHED */;
    }
    else {
        return res.json({ 'status': constants_1.Status.Error, 'message': 'Invald contract status' });
    }
    Contract_1.Contract.findOne({ 'company': req.companyId, '_id': params.contractId }, (err, contract) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (contract == undefined || contract == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid contract.' });
        }
        if (contract.status == 2 /* CANCELED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Contract is already canceled.' });
        }
        if (contract.status == 3 /* REJECTED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Contract is already rejected.' });
        }
        if (contract.status == 4 /* FINISHED */) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Contract is already finished.' });
        }
        contract.updateOne({ status: contractStatus }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            // ToDo send email to company /contractor on update
            Company_1.Company.findById(contract.contractor, (err, contractor) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                // sendContractStatusChangeEmailToContractor({ to: contractor.info.companyEmail, contractor: contractor.info.companyName , company: company.info.companyName, contractStatus:params.status+'ed' })
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Contract ' + params.status + 'ed.' });
            });
        });
    });
};
exports.upgradeToCompany = (req, res) => {
    // return res.json({ 'status': Status.Error, 'message': 'reached inside.' })
    const params = req.body;
    const user = req.user;
    Company_1.Company.findById(user.company, (err, contractor) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (contractor == undefined || contractor == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid user.' });
        }
        if (contractor.type == 0 || contractor.paid == true) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'You can not upgrade.' });
        }
        // create strip customer and charge
        stripe_1.addCustomerAndCharge(contractor.info.companyEmail, 'company ' + contractor.info.companyName, params.token, 50, (status, customer, charge, message) => {
            if (status == 1) {
                var chargeDate = new Date();
                chargeDate.setDate(chargeDate.getDate() + 30);
                contractor.paid = true;
                contractor.type = 0;
                contractor.chargeDate = chargeDate;
                contractor.updateOne(contractor, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    const stripCard = customer.sources.data[0];
                    const card = new CompanyCard_1.CompanyCard({
                        ending: params.ending,
                        token: params.token,
                        company: contractor._id,
                        cardStripeId: stripCard.id,
                        expiryMonth: stripCard.exp_month,
                        expiryYear: stripCard.exp_year,
                        cardType: stripCard.brand,
                        name: stripCard.name
                    });
                    card.save((err) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        _upgradeHubSpotContact(contractor);
                        return res.json({ status: constants_1.Status.Success, message: "Account upgraded successfully." });
                    });
                });
            }
            else {
                return res.json({ status: constants_1.Status.Error, message: message });
            }
        });
    });
};
const _upgradeHubSpotContact = (company) => {
    const hubspot = new Hubspot({
        apiKey: '163d5d65-83c0-4d5f-9dcf-55b052f9ef4d'
    });
    hubspot.contacts.updateByEmail(company.info.companyEmail, {
        "properties": [
            {
                "property": "customer_type",
                "value": "Company"
            }
        ]
    })
        .then((response) => console.log(response))
        .catch((error) => console.error(error));
};
exports.agreeToTermAndConditions = (req, res) => {
    const params = req.body;
    const user = req.user;
    user.updateOne({
        agreed: params.agreedStatus
    }, (err, raw) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Status updated successfully.' });
    });
};
exports.companySubscribe = (req, res) => {
    const company = req.company;
    if (company.stripeId == undefined || company.stripeId == '') {
        return res.json({ 'status': constants_1.Status.Error, 'message': "Company payment method required." });
    }
    var amount = 50;
    if (amount == 0) {
        return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid no of subscriptions." });
    }
    stripe_1.chargeSubscription(amount, company.stripeId, (status, charge, message) => {
        if (status == 1) {
            company.updateOne({ paid: true })
                .exec((err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Company subscription added successfull.' });
            });
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': message });
        }
    });
};
exports.checkAndGetUser = (req, res) => {
    const params = req.body;
    User_1.User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType }, (err, user) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (user == undefined || user == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No user found' });
        }
        if (user.permissions.role != 3 /* COMPANY_ADMIN */ && user.permissions.role != 4 /* GLOBAL_ADMIN */) {
            const employee = user;
            Company_1.Company.findById(employee.company, (err, company) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                if (company.paid == false && new Date() > company.chargeDate) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'You can\'t login please contact your Company.' });
                }
                if (employee.status == 0) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.AccountDeleted });
                }
                return res.json({ 'status': constants_1.Status.Success, 'user': user, 'token': user.jwt() });
            });
        }
        else {
            const admin = user;
            Company_1.Company.findById(admin.company, (err, company) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                company.userPermissions = undefined;
                company.employees = undefined;
                company.customers = undefined;
                company.paid = undefined;
                company.type = undefined;
                company.maxTechnicians = undefined;
                company.maxManagers = undefined;
                company.maxOfficeAdmins = undefined;
                return res.json({ 'status': constants_1.Status.Success, 'user': user, 'company': company, 'token': user.jwt() });
            });
        }
    });
};
exports.createCompanySocial = (req, res) => {
    const params = req.body;
    const chargeDate = new Date();
    chargeDate.setDate(chargeDate.getDate() + 30);
    User_1.User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType, type: 0 }, (err, previousUser) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (previousUser != undefined || previousUser != null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UserExists });
        }
        checkCompanyEmailExists(req, res, (req, res) => {
            const company = new Company_1.Company({
                info: {
                    companyName: params.companyName,
                    industry: params.industryId,
                    logoUrl: '',
                    companyEmail: params.email,
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
                userPermissions: constants_1.UserPermissions,
                chargeDate: chargeDate,
                maxTechnicians: 2,
                maxManagers: 1,
                maxOfficeAdmins: 1
            });
            company.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                const companyAdmin = new CompanyAdmin_1.CompanyAdmin({
                    auth: {
                        email: params.email,
                        socialId: params.socialId,
                        connectorType: params.connectorType,
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
                        role: 3 /* COMPANY_ADMIN */,
                        extra: [],
                    },
                    company: company._id
                });
                companyAdmin.save((err) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    aws_1.sendEmail({ to: params.email });
                    return res.json({ 'status': constants_1.Status.Success, 'user': companyAdmin, 'token': companyAdmin.jwt() });
                });
            });
        });
    });
};
exports.createContractorSocial = (req, res) => {
    const params = req.body;
    const chargeDate = new Date();
    chargeDate.setDate(chargeDate.getDate() + 30);
    User_1.User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType, type: 1 }, (err, previousUser) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (previousUser != undefined || previousUser != null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UserExists });
        }
        checkCompanyEmailExists(req, res, (req, res) => {
            const params = req.body;
            const company = new Company_1.Company({
                info: {
                    companyName: params.companyName,
                    industry: params.industryId,
                    logoUrl: '',
                    companyEmail: params.email,
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
                auth: {
                    email: params.email,
                    password: params.password,
                },
                type: 1,
                userPermissions: constants_1.UserPermissions
            });
            company.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                const companyAdmin = new CompanyAdmin_1.CompanyAdmin({
                    auth: {
                        email: params.email,
                        socialId: params.socialId,
                        connectorType: params.connectorType,
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
                        role: 3 /* COMPANY_ADMIN */,
                        extra: [],
                    },
                    company: company._id
                });
                companyAdmin.save((err) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    aws_1.sendEmail({ to: params.email });
                    return res.json({ 'status': constants_1.Status.Success, 'user': companyAdmin, 'token': companyAdmin.jwt() });
                });
            });
        });
    });
};
//# sourceMappingURL=user.js.map