"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Company_1 = require("../models/Company");
const Employee_1 = require("../models/Employee");
const Contract_1 = require("../models/Contract");
const config_1 = require("../common/config");
exports.getAllPermissions = (req, res) => {
    const company = req.company;
    if (company.userPermissions == undefined || !company.userPermissions) {
        setDefaultPermissions(req, res, (req, res, company) => {
            return res.json({ 'status': constants_1.Status.Success, 'permissions': company.userPermissions });
        });
    }
    return res.json({ 'status': constants_1.Status.Success, 'permissions': company.userPermissions });
};
exports.getOfficeAdminPermissions = (req, res) => {
    const company = req.company;
    if (company.userPermissions == undefined || !company.userPermissions) {
        setDefaultPermissions(req, res, (req, res, company) => {
            return res.json({ 'status': constants_1.Status.Success, 'permissions': company.userPermissions[0] });
        });
    }
    return res.json({ 'status': constants_1.Status.Success, 'permissions': company.userPermissions[0] });
};
exports.getTechPermissions = (req, res) => {
    const company = req.company;
    if (company.userPermissions == undefined || !company.userPermissions) {
        setDefaultPermissions(req, res, (req, res, company) => {
            return res.json({ 'status': constants_1.Status.Success, 'permissions': company.userPermissions[1] });
        });
    }
    return res.json({ 'status': constants_1.Status.Success, 'permissions': company.userPermissions[1] });
};
exports.getManagerPermissions = (req, res) => {
    const company = req.company;
    if (company.userPermissions == undefined || !company.userPermissions) {
        setDefaultPermissions(req, res, (req, res, company) => {
            return res.json({ 'status': constants_1.Status.Success, 'permissions': company.userPermissions[2] });
        });
    }
    return res.json({ 'status': constants_1.Status.Success, 'permissions': company.userPermissions[2] });
};
exports.getUserPermissions = (req, res) => {
    const params = req.body;
    const company = req.company;
    if (company.userPermissions == undefined || !company.userPermissions) {
        getPermissionByEmployeeId(req, res, company, params.employeeId, (req, res, permissions) => {
            return res.json({ 'status': constants_1.Status.Success, 'permissions': permissions });
        });
    }
    getPermissionByEmployeeId(req, res, company, params.employeeId, (req, res, permissions) => {
        return res.json({ 'status': constants_1.Status.Success, 'permissions': permissions });
    });
};
exports.updateDefaultPermissions = (req, res) => {
    const params = req.body;
    const company = req.company;
    var userOn = params.onPermissions.split(',');
    var userOff = params.offPermissions.split(',');
    var userPermissionsToUpdate = company.userPermissions;
    switch (params.role) {
        case '0':
            userPermissionsToUpdate[0].on = userOn;
            userPermissionsToUpdate[0].off = userOff;
            break;
        case '1':
            userPermissionsToUpdate[1].on = userOn;
            userPermissionsToUpdate[1].off = userOff;
            break;
        case '2':
            userPermissionsToUpdate[2].on = userOn;
            userPermissionsToUpdate[2].off = userOff;
            break;
        default:
            break;
    }
    if (company.userPermissions == undefined || !company.userPermissions) {
        udpateDefaultPermissions(req, res, userPermissionsToUpdate, (req, res, company) => {
            return res.json({ 'status': constants_1.Status.Success, 'message': 'permissions updated successfuly' });
        });
    }
    udpateDefaultPermissions(req, res, userPermissionsToUpdate, (req, res, company) => {
        return res.json({ 'status': constants_1.Status.Success, 'message': 'permissions updated successfuly' });
    });
};
exports.updateUserPermissions = (req, res) => {
    const params = req.body;
    var onPermissions = params.onPermissions.split(',');
    var offPermissions = params.offPermissions.split(',');
    var newPermissions = {
        on: onPermissions,
        off: offPermissions,
    };
    Employee_1.Employee.findById(params.employeeId, (err, employee) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        employee.updateOne({
            extraPermissions: newPermissions
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'permissions updated successfully.' });
        });
    });
};
const udpateDefaultPermissions = (req, res, permissions, next) => {
    const company = req.company;
    company.updateOne({
        userPermissions: permissions,
    }, (err, raw) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        next(req, res, company);
    });
};
const setDefaultPermissions = (req, res, next) => {
    const company = req.company;
    company.updateOne({
        userPermissions: constants_1.UserPermissions,
    }, (err, raw) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        next(req, res, company);
    });
};
const getPermissionByEmployeeId = (req, res, company, employeeId, next) => {
    Employee_1.Employee.findById(employeeId)
        .populate({ path: 'company' })
        .exec((err, employee) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        var defaultPermissionsOn = [];
        var defaultPermissionsOff = [];
        switch (employee.permissions.role) {
            case 0:
                defaultPermissionsOn = company.userPermissions[0].on;
                defaultPermissionsOff = company.userPermissions[0].off;
                break;
            case 1:
                defaultPermissionsOn = company.userPermissions[1].on;
                defaultPermissionsOff = company.userPermissions[1].off;
                break;
            case 2:
                defaultPermissionsOn = company.userPermissions[2].on;
                defaultPermissionsOff = company.userPermissions[2].off;
                break;
            default:
                break;
        }
        defaultPermissionsOn = defaultPermissionsOn.filter(function (el) {
            return employee.extraPermissions.off.indexOf(el) < 0;
        });
        defaultPermissionsOn = defaultPermissionsOn.filter(function (el) {
            return employee.extraPermissions.on.indexOf(el) < 0;
        });
        defaultPermissionsOff = defaultPermissionsOff.filter(function (el) {
            return employee.extraPermissions.off.indexOf(el) < 0;
        });
        defaultPermissionsOff = defaultPermissionsOff.filter(function (el) {
            return employee.extraPermissions.on.indexOf(el) < 0;
        });
        defaultPermissionsOn = defaultPermissionsOn.concat(employee.extraPermissions.on);
        defaultPermissionsOff = defaultPermissionsOff.concat(employee.extraPermissions.off);
        const employeePermissions = {
            on: defaultPermissionsOn,
            off: defaultPermissionsOff,
        };
        next(req, res, employeePermissions);
    });
};
exports.addContractorPermissions = (req, res) => {
    const params = req.body;
    var permissions = params.permissions.split(',').map(Number);
    let checker = (arr, target) => target.every((v) => arr.includes(v));
    if (!checker(constants_1.ContractorPermissions.on, permissions)) {
        return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid permissions for contractor' });
    }
    Contract_1.Contract.findOne({ contractor: params.contractorId, company: req.companyId }, (err, contract) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        contract.updateOne({
            extraPermissions: permissions
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Contractor permissions added successfully.' });
        });
    });
};
exports.updateAllCompaniesPermissions = (req, res) => {
    const params = req.body;
    if (params.first == 'ZAhhNlQ561' && params.second == config_1.privateKey.key) {
        Company_1.Company.find({}, (err, companies) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            const count = companies.length;
            let loopcount = 0;
            companies.forEach(company => {
                company.updateOne({ userPermissions: constants_1.UserPermissions }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    loopcount++;
                    if (loopcount == count) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': 'Default permissions updated' });
                    }
                });
            });
        });
    }
};
//# sourceMappingURL=permission.js.map