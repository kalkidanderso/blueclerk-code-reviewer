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
const Company_1 = require("../models/Company");
const Employee_1 = require("../models/Employee");
const Contract_1 = require("../models/Contract");
exports.checkPermissions = (minAuth) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        if (user.permissions.role < minAuth) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
        }
        next();
    });
};
exports.checkUserPermissions = (permissionId) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        if (user.permissions.role == 4 /* GLOBAL_ADMIN */) {
            next();
            return;
        }
        // check if get contracts
        if (user.permissions.role == 3 /* COMPANY_ADMIN */) {
            const companyAdmin = req.user;
            Company_1.Company.findById(companyAdmin.company, (err, company) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': "Unable to find your company. Contact BlueClerk admin for more." });
                }
                if (company.type == 1) {
                    // it is contractor check contractor permissions from default or contract
                    if (permissionId == 65 /* Get_All_Contracts */ || permissionId == 62 /* Accept_Reject_Contract */ || permissionId == 67 /* Upgrade_To_Company */) {
                        next();
                        return;
                    }
                    // check other contractor permissions
                    Contract_1.Contract.findOne({ company: req.otherCompanyId, contractor: company._id }, (err, contract) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        if (contract == undefined || contract == null) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': 'No Contract found.' });
                        }
                        if (contract.status == 2 /* CANCELED */ || contract.status == 4 /* FINISHED */) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': 'Your contract is no more valid.' });
                        }
                        if (contract.extraPermissions == undefined) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                        }
                        if (!contract.extraPermissions.includes(permissionId)) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                        }
                        next();
                        return;
                    });
                }
                else {
                    if (req.otherCompanyId != undefined || req.otherCompanyId != null) {
                        // it is contracting company hiting api's for other company
                        if (permissionId == 65 /* Get_All_Contracts */ || permissionId == 62 /* Accept_Reject_Contract */) {
                            next();
                            return;
                        }
                        // find contract with other company and get permissions from contract
                        Contract_1.Contract.findOne({ company: req.otherCompanyId, contractor: req.companyId }, (err, contract) => {
                            if (err) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                            }
                            if (contract == undefined || contract == null) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': 'No Contract found.' });
                            }
                            if (contract.extraPermissions == undefined) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                            }
                            if (!contract.extraPermissions.includes(permissionId)) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                            }
                            next();
                            return;
                        });
                    }
                    else {
                        // it is not a contractinig company
                        if (permissionId == 66 /* Get_Company_Contracts */ || permissionId == 63 /* Cancel_Finish_Contract */) {
                            next();
                            return;
                        }
                        if (!company.userPermissions[3].on.includes(permissionId)) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                        }
                        next();
                        return;
                    }
                }
            });
        }
        else {
            Employee_1.Employee.findById(user._id, (err, employee) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                if (employee.extraPermissions != undefined) {
                    if (employee.extraPermissions.on.includes(permissionId)) {
                        next();
                        return;
                    }
                    if (employee.extraPermissions.off.includes(permissionId)) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                    }
                    Company_1.Company.findById(employee.company, (err, company) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        switch (user.permissions.role) {
                            case 0:
                                if (!company.userPermissions[0].on.includes(permissionId)) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                                }
                                next();
                                break;
                            case 1:
                                if (!company.userPermissions[1].on.includes(permissionId)) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                                }
                                next();
                                break;
                            case 2:
                                if (!company.userPermissions[2].on.includes(permissionId)) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                                }
                                next();
                                break;
                            case 3:
                                if (!company.userPermissions[3].on.includes(permissionId)) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
                                }
                                next();
                                break;
                            default:
                                // return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                                break;
                        }
                        return;
                    });
                }
            });
        }
    });
};
//# sourceMappingURL=permissions.js.map