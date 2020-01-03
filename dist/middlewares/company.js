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
// export const getCompnayId = () => {
//     return async (req: Request, res: Response, next: NextFunction) => {
//         const user = <IUser>req.user
//         const employee = <IEmployee>req.user
//         var companyId
//         if (employee.company) {
//             companyId = employee.company
//         } else {
//             companyId = user._id
//         }
//         req.companyId = companyId
//         next()
//     }
// }
exports.getCompnayId = () => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        if (user.permissions.role == 3 /* COMPANY */) {
            req.company = user;
            req.companyId = user._id;
            next();
        }
        else if (user.permissions.role != 4 /* GLOBAL_ADMIN */) {
            const employee = req.user;
            Company_1.Company.findById(employee.company, (err, company) => {
                req.company = company;
                req.companyId = company._id;
                next();
            });
        }
        else {
            next();
        }
    });
};
//# sourceMappingURL=company.js.map