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
        const employee = user;
        if (employee.extraPermissions != undefined) {
            if (employee.extraPermissions.on.includes(permissionId)) {
                next();
                return;
            }
            if (employee.extraPermissions.off.includes(permissionId)) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.UnAuthorized });
            }
        }
        Company_1.Company.findById(req.companyId, (err, company) => {
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
    });
};
//# sourceMappingURL=permissions.js.map