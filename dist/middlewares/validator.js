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
    socialLogin: [express_validator_1.check('socialId').exists(), express_validator_1.check('connectorType').exists(), express_validator_1.check('connectorType').isNumeric()],
    socialSignUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('socialId').exists(), express_validator_1.check('connectorType').exists(), express_validator_1.check('connectorType').isNumeric(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('companyName').exists(), express_validator_1.check('industryId').exists()],
    customerImport: [express_validator_1.check('customerSheet').exists()],
    // companySubscribe: [check('agreedStatus').exists()],
    agree: [express_validator_1.check('agreedStatus').exists()],
    signUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('companyName').exists(), express_validator_1.check('industryId').exists()],
    adminSignUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    contractorSignup: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('companyName').exists(), express_validator_1.check('industryId').exists()],
    searchContractor: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail()],
    inviteContractor: [express_validator_1.check('contractorId').exists()],
    updateContract: [express_validator_1.check('contractId').exists(), express_validator_1.check('status').exists()],
    contractorPermissions: [express_validator_1.check('contractorId').exists(), express_validator_1.check('permissions').exists()],
    upgradeToCompany: [express_validator_1.check('token').exists(), express_validator_1.check('ending').exists()],
    // customWorkOrder: [check('workOrderNumber').exists(), check('workOrderNumber').isNumeric()],
    //Users
    createManager: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    createTechnician: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    createOfficeAdmin: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    updateProfile: [express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('imageUrl').exists()],
    changePassword: [express_validator_1.check('currentPassword').exists(), express_validator_1.check('newPassword').exists()],
    updateCompanyProfile: [express_validator_1.check('companyName').exists(), express_validator_1.check('logoUrl').exists(), express_validator_1.check('street').exists(), express_validator_1.check('city').exists(), express_validator_1.check('state').exists(), express_validator_1.check('zipCode').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('fax').exists()],
    deleteEmployee: [express_validator_1.check('employeeId').exists()],
    forgotPassword: [express_validator_1.check('email').exists()],
    //Industry
    createIndustry: [express_validator_1.check('title').exists()],
    removeIndustry: [express_validator_1.check('industryId').exists()],
    //Equipment Type
    createEquipmentType: [express_validator_1.check('title').exists()],
    //Equipment Brand
    createEquipmentBrand: [express_validator_1.check('title').exists()],
    //Customers
    createCustomer: [express_validator_1.check('name').exists()],
    updateCustomer: [express_validator_1.check('customerId').exists(), express_validator_1.check('name').exists()],
    // createCustomer: [check('email').exists(), check('email').isEmail(), check('name').exists(), check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(), check('contactName').exists(), check('phone').exists()],
    getCustomers: [express_validator_1.check('includeActive').exists(), express_validator_1.check('includeNonActive').exists()],
    getCustomerDetail: [express_validator_1.check('customerId').exists()],
    //Customer Equipment
    createCustomerEquipment: [express_validator_1.check('model').exists(), express_validator_1.check('serialNumber').exists(), express_validator_1.check('nfcTag').exists(), express_validator_1.check('equipmentTypeId').exists(), express_validator_1.check('equipmentBrandId').exists(), express_validator_1.check('customerId').exists(), express_validator_1.check('location').exists(), express_validator_1.check('images').exists()],
    getCustomerEquipments: [express_validator_1.check('customerId').exists()],
    linkEquipmentJob: [express_validator_1.check('nfcTag').exists(), express_validator_1.check('jobId').exists(), express_validator_1.check('comment').exists()],
    getCustomerEquipmentJobs: [express_validator_1.check('nfcTag').exists()],
    //Job Type
    createJobType: [express_validator_1.check('title').exists()],
    //Job
    createJob: [express_validator_1.check('dateTime').exists(), express_validator_1.check('technicianId').exists(), express_validator_1.check('customerId').exists(), express_validator_1.check('jobTypeId').exists(), express_validator_1.check('ticketId').exists(), express_validator_1.check('employeeType').exists(), express_validator_1.check('employeeType').isNumeric()],
    generalJob: [express_validator_1.check('jobId').exists()],
    updateJob: [express_validator_1.check('status').exists(), express_validator_1.check('comment').exists(), express_validator_1.check('jobId').exists()],
    editJob: [express_validator_1.check('jobId').exists(), express_validator_1.check('technicianId').exists(), express_validator_1.check('dateTime').exists()],
    technicianJobs: [express_validator_1.check('employeeId').exists()],
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
    createEquipmentInventory: [express_validator_1.check('dateTime').exists()],
    // Tags
    placeOrder: [express_validator_1.check('noOfTags').exists(), express_validator_1.check('total').exists(), express_validator_1.check('tax').exists(), express_validator_1.check('cardId').exists(), express_validator_1.check('street').exists(), express_validator_1.check('city').exists(), express_validator_1.check('state').exists(), express_validator_1.check('zipCode').exists(),],
    // Company Cards
    addCompanyCard: [express_validator_1.check('token').exists(), express_validator_1.check('ending').exists()],
    removeCompanyCard: [express_validator_1.check('cardId').exists()],
    subscribe: [express_validator_1.check('cardId').exists(), express_validator_1.check('planId').exists()],
    buySubscriptions: [express_validator_1.check('noOfOfficeAdmins').exists(), express_validator_1.check('noOfTechnicians').exists(), express_validator_1.check('noOfManagers').exists(),],
    updateDefaultPermissions: [express_validator_1.check('onPermissions').exists(), express_validator_1.check('offPermissions').exists(), express_validator_1.check('role').exists()],
    udpateUserPermissions: [express_validator_1.check('onPermissions').exists(), express_validator_1.check('offPermissions').exists()],
    employeePermissions: [express_validator_1.check('employeeId').exists()],
    createTicket: [express_validator_1.check('customerId').exists()],
    updateTicket: [express_validator_1.check('ticketId').exists(), express_validator_1.check('note').exists()],
    getTicketDetail: [express_validator_1.check('ticketId').exists()],
    getJobReport: [express_validator_1.check('jobId').exists()],
};
//# sourceMappingURL=validator.js.map