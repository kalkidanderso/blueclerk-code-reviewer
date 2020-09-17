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
    signUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('password').exists(), express_validator_1.check('companyName').exists(), express_validator_1.check('industryId').exists()],
    login: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists()],
    socialLogin: [express_validator_1.check('socialId').exists(), express_validator_1.check('connectorType').exists(), express_validator_1.check('connectorType').isNumeric()],
    socialSignUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('socialId').exists(), express_validator_1.check('connectorType').exists(), express_validator_1.check('connectorType').isNumeric(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('companyName').exists(), express_validator_1.check('industryId').exists()],
    customerImport: [express_validator_1.check('customerSheet').exists()],
    agree: [express_validator_1.check('agreedStatus').exists()],
    adminSignUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    contractorSignup: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('password').exists(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('companyName').exists(), express_validator_1.check('industryId').exists()],
    contractorSocialSignUp: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('socialId').exists(), express_validator_1.check('connectorType').exists(), express_validator_1.check('connectorType').isNumeric(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists(), express_validator_1.check('companyName').exists(), express_validator_1.check('industryId').exists()],
    searchContractor: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail()],
    inviteContractor: [express_validator_1.check('contractorId').exists()],
    updateContract: [express_validator_1.check('contractId').exists(), express_validator_1.check('status').exists()],
    contractorPermissions: [express_validator_1.check('contractorId').exists(), express_validator_1.check('permissions').exists()],
    upgradeToCompany: [express_validator_1.check('token').exists(), express_validator_1.check('ending').exists()],
    //Users
    createManager: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    createTechnician: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    createOfficeAdmin: [express_validator_1.check('email').exists(), express_validator_1.check('email').isEmail(), express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists(), express_validator_1.check('phone').exists()],
    updateProfile: [express_validator_1.check('firstName').exists(), express_validator_1.check('lastName').exists()],
    changePassword: [express_validator_1.check('currentPassword').exists(), express_validator_1.check('newPassword').exists()],
    updateCompanyProfile: [express_validator_1.check('companyName').exists(), express_validator_1.check('companyEmail').exists(), express_validator_1.check('companyEmail').isEmail(), express_validator_1.check('phone').exists()],
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
    getCustomers: [express_validator_1.check('includeActive').exists(), express_validator_1.check('includeNonActive').exists()],
    getCustomerDetail: [express_validator_1.check('customerId').exists()],
    //Customer Equipment
    createCustomerEquipment: [express_validator_1.check('model').exists(), express_validator_1.check('serialNumber').exists(), express_validator_1.check('nfcTag').exists(), express_validator_1.check('equipmentTypeId').exists(), express_validator_1.check('equipmentBrandId').exists(), express_validator_1.check('customerId').exists(), express_validator_1.check('location').exists(), express_validator_1.check('images').exists()],
    getCustomerEquipments: [express_validator_1.check('customerId').exists()],
    getCustomerEquipmentInfo: [express_validator_1.check('nfcTag').exists()],
    linkEquipmentJob: [express_validator_1.check('nfcTag').exists(), express_validator_1.check('jobId').exists(), express_validator_1.check('comment').exists()],
    getCustomerEquipmentJobs: [express_validator_1.check('nfcTag').exists()],
    //Job Type
    createJobType: [express_validator_1.check('title').exists()],
    editJobType: [express_validator_1.check('jobTypeId').exists(), express_validator_1.check('title').exists()],
    changeJobTypeStatus: [express_validator_1.check('jobTypeId').exists(), express_validator_1.check('status').exists()],
    //Job
    createJob: [express_validator_1.check('scheduleDate').exists(), express_validator_1.check('technicianId').exists(), express_validator_1.check('customerId').exists(), express_validator_1.check('jobTypeId').exists(), express_validator_1.check('ticketId').exists(), express_validator_1.check('employeeType').exists(), express_validator_1.check('employeeType').isNumeric()],
    generalJob: [express_validator_1.check('jobId').exists()],
    updateJob: [express_validator_1.check('status').exists(), express_validator_1.check('comment').exists(), express_validator_1.check('jobId').exists()],
    editJob: [express_validator_1.check('jobId').exists(), express_validator_1.check('technicianId').exists(), express_validator_1.check('scheduleDate').exists()],
    updateJobTime: [express_validator_1.check('jobId').exists()],
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
    editTicket: [express_validator_1.check('ticketId').exists(), express_validator_1.check('status').exists(), express_validator_1.check('status').isNumeric()],
    updateTicket: [express_validator_1.check('ticketId').exists(), express_validator_1.check('note').exists()],
    getTicketDetail: [express_validator_1.check('ticketId').exists()],
    getJobReport: [express_validator_1.check('jobId').exists()],
    createQBCustomer: [express_validator_1.check('name').exists(), express_validator_1.check('name').not().isEmpty()],
    createSaleTax: [express_validator_1.check('state').exists(), express_validator_1.check('tax').exists()],
    updateSaleTax: [express_validator_1.check('salesTaxId').exists(), express_validator_1.check('state').exists(), express_validator_1.check('tax').exists()],
    deleteSaleTax: [express_validator_1.check('salesTaxId').exists()],
    createJobCharges: [express_validator_1.check('jobTypeId').exists(), express_validator_1.check('charges').exists(), express_validator_1.check('isFixed').exists()],
    updateJobCharges: [express_validator_1.check('jobChargesId').exists(), express_validator_1.check('charges').exists(), express_validator_1.check('isFixed').exists()],
    deleteJobCharges: [express_validator_1.check('jobChargesId').exists()],
    //createInvoice: [],
    createPOInvoice: [express_validator_1.check('purchaseOrderId').exists()],
    updateInvoice: [express_validator_1.check('invoiceId').exists()],
    getInvoiceDetail: [express_validator_1.check('invoiceId').exists()],
    createPartInventory: [express_validator_1.check('name').exists(), express_validator_1.check('itemCode').exists(), express_validator_1.check('cost').exists(), express_validator_1.check('price').exists(), express_validator_1.check('totalQuantity').exists()],
    udpatePartInventory: [express_validator_1.check('partId').exists(), express_validator_1.check('name').exists(), express_validator_1.check('itemCode').exists(), express_validator_1.check('cost').exists(), express_validator_1.check('price').exists(), express_validator_1.check('totalQuantity').exists()],
    removePartInventory: [express_validator_1.check('partId').exists()],
    createPurchaseOrder: [express_validator_1.check('customer').exists(), express_validator_1.check('note').exists()],
    udpatePurchaseOrder: [express_validator_1.check('purchaseOrderId').exists(), express_validator_1.check('total').exists(), express_validator_1.check('note').exists()],
    udpatePurchaseOrderStatus: [express_validator_1.check('purchaseOrderId').exists(), express_validator_1.check('status').exists()],
    getEquipmentPO: [express_validator_1.check('equipmentId').exists()],
    createPurchaseOrderEstimate: [express_validator_1.check('estimateId').exists()],
    udpateEstimate: [express_validator_1.check('estimateId').exists(), express_validator_1.check('total').exists(), express_validator_1.check('customer').exists()],
    udpateEstimateStatus: [express_validator_1.check('estimateId').exists()],
    cancelEstimate: [express_validator_1.check('estimateId').exists()],
    updateItem: [express_validator_1.check('itemId').exists(), express_validator_1.check('charges').exists(), express_validator_1.check('isFixed').exists(), express_validator_1.check('tax').exists()],
    getInvoiceByCustomer: [express_validator_1.check('customer').exists()],
    recordPayment: [express_validator_1.check('amount').exists(), express_validator_1.check('referenceNumber').exists(), express_validator_1.check('paidAt').exists(), express_validator_1.check('customer').exists(), express_validator_1.check('invoices').exists()],
    updatePayment: [express_validator_1.check('paymentId').exists(), express_validator_1.check('amount').exists(), express_validator_1.check('referenceNumber').exists(), express_validator_1.check('paidAt').exists(), express_validator_1.check('invoices').exists()],
    getPaymentsByCustomer: [express_validator_1.check('customer').exists()],
    codeLocationTag: [express_validator_1.check('latitude').exists(), express_validator_1.check('longitude').exists(), express_validator_1.check('nfcTag').exists()],
    updateLocationTag: [express_validator_1.check('nfcTag').exists(), express_validator_1.check('latitude').exists(), express_validator_1.check('longitude').exists(), express_validator_1.check('nfcTag').exists()],
    getLocationTagJobs: [express_validator_1.check('nfcTag').exists()],
};
//# sourceMappingURL=validator.js.map