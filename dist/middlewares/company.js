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
const Company_1 = require("../models/Company");
const constants_1 = require("../common/constants");
exports.getCompnayId = () => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        req.otherCompanyId = undefined;
        // check if contractor or organization is making the request
        if (req.body.companyId != undefined) {
            req.otherCompanyId = req.body.companyId;
        }
        if (user.permissions.role == 3 /* COMPANY_ADMIN */) {
            const comapnyAdmin = req.user;
            Company_1.Company.findById(comapnyAdmin.company, (err, company) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': "Unable to find your company. Contact BlueClerk admin for more." });
                }
                // if(company.type == 1 && (req.body.companyId == undefined || req.body.companyId == null) ){
                //     return res.json({'status': Status.Error, 'message': 'Company id is required.'})
                // }else{
                //     req.company = company
                //     req.companyId = company._id
                //     next()
                //     return
                // }
                req.company = company;
                req.companyId = company._id;
                next();
                return;
            });
        }
        else if (user.permissions.role != 4 /* GLOBAL_ADMIN */) {
            const employee = req.user;
            Company_1.Company.findById(employee.company, (err, company) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': "Unable to find your company. Contact BlueClerk admin for more." });
                }
                req.company = company;
                req.companyId = company._id;
                next();
                return;
            });
        }
        else {
            next();
            return;
        }
    });
};
//# sourceMappingURL=company.js.map