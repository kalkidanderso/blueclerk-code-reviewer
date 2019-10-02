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
const express_validator_1 = require("express-validator");
const constants_1 = require("../common/constants");
exports.validate = (validations) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        yield Promise.all(validations.map(validation => validation.run(req)));
        const errors = express_validator_1.validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.MissingParams });
    });
};
exports.Validations = {
    //Auth
    login: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists()],
    signUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('companyName').exists(), express_validator_1.check('industryId').exists()],
    adminSignUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    //Users
    createManager: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    createTechnician: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    createOfficeAdmin: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    updateProfile: [express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('imageUrl').exists()],
    changePassword: [express_validator_1.check('currentPassword').exists(), express_validator_1.check('newPassword').exists()],
    updateCompanyProfile: [express_validator_1.check('companyName').exists(), express_validator_1.check('logoUrl').exists(), express_validator_1.check('street').exists(), express_validator_1.check('city').exists(), express_validator_1.check('state').exists(), express_validator_1.check('zipCode').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('fax').exists()],
    //Industry
    createIndustry: [express_validator_1.check('title').exists()],
    //Equipment Type
    createEquipmentType: [express_validator_1.check('title').exists()],
    //Equipment Brand
    createEquipmentBrand: [express_validator_1.check('title').exists()],
    //Customers
    createCustomer: [express_validator_1.check('name').exists()],
    // createCustomer: [check('email').exists(), check('email').isEmail(), check('name').exists(), check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(), check('contactName').exists(), check('phone').exists()],
    getCustomers: [express_validator_1.check('includeActive').exists(), express_validator_1.check('includeNonActive').exists()],
    //Customer Equipment
    createCustomerEquipment: [express_validator_1.check('model').exists(), express_validator_1.check('serialNumber').exists(), express_validator_1.check('nfcTag').exists(), express_validator_1.check('imageUrl').exists(), express_validator_1.check('equipmentTypeId').exists(), express_validator_1.check('equipmentBrandId').exists(), express_validator_1.check('customerId').exists()],
    getCustomerEquipments: [express_validator_1.check('customerId').exists()],
    linkEquipmentJob: [express_validator_1.check('nfcTag').exists(), express_validator_1.check('jobId').exists()],
    getCustomerEquipmentJobs: [express_validator_1.check('equipmentId').exists()],
    //Job Type
    createJobType: [express_validator_1.check('title').exists()],
    //Job
    createJob: [express_validator_1.check('dateTime').exists(), express_validator_1.check('technicianId').exists(), express_validator_1.check('customerId').exists(), express_validator_1.check('jobTypeId').exists()],
    updateJob: [express_validator_1.check('status').exists(), express_validator_1.check('comment').exists(), express_validator_1.check('jobId').exists()],
    //Group
    createGroup: [express_validator_1.check('title').exists()],
    groupGeneric: [express_validator_1.check('groupId').exists()],
    addManager: [express_validator_1.check('groupId').exists(), express_validator_1.check('managerId').exists()],
    memberGeneric: [express_validator_1.check('groupId').exists(), express_validator_1.check('memberId').exists()],
    //Company Equipemnt
    createCompanyEquipment: [express_validator_1.check('imageUrl').exists(), express_validator_1.check('model').exists(), express_validator_1.check('serialNumber').exists(), express_validator_1.check('typeId').exists(), express_validator_1.check('brandId').exists()],
    //Company Equipemnt History
    createCompanyEquipmentHistory: [express_validator_1.check('action').exists(), express_validator_1.check('dateTime').exists()],
    //Company Equipemnt Inventory
    createEquipmentInventory: [express_validator_1.check('dateTime').exists(), express_validator_1.check('nfcTags').exists(), express_validator_1.check('qrCodes').exists()],
    // Tags
    placeOrder: [express_validator_1.check('noOfTags').exists(), express_validator_1.check('total').exists(), express_validator_1.check('tax').exists(), express_validator_1.check('dateTime').exists()],
    udpateOrder: [express_validator_1.check('status').exists(), express_validator_1.check('orderId').exists(), express_validator_1.check('orderStatus').exists()]
};
//# sourceMappingURL=validator.js.map