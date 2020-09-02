"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validator_1 = require("../middlewares/validator");
const passport_1 = __importDefault(require("passport"));
const permissions_1 = require("../middlewares/permissions");
const company_1 = require("../middlewares/company");
const userController = __importStar(require("../controllers/user"));
const jobTypeController = __importStar(require("../controllers/jobType"));
const equipmentTypeController = __importStar(require("../controllers/equipmentType"));
const equipmentBrandController = __importStar(require("../controllers/equipmentBrand"));
const customerController = __importStar(require("../controllers/customer"));
const customerEquipmentController = __importStar(require("../controllers/customerEquipment"));
const industryController = __importStar(require("../controllers/industry"));
const jobController = __importStar(require("../controllers/job"));
const imageController = __importStar(require("../controllers/image"));
const groupController = __importStar(require("../controllers/group"));
const companyEquipmentController = __importStar(require("../controllers/companyEquipment"));
const orderController = __importStar(require("../controllers/order"));
const companyEquipmentHistoryController = __importStar(require("../controllers/companyEquipmentHistory"));
const companyEquipmentInventoryController = __importStar(require("../controllers/companyEquipmentInventory"));
const companyCardController = __importStar(require("../controllers/companyCard"));
const subscriptionController = __importStar(require("../controllers/subscription"));
const permissionController = __importStar(require("../controllers/permission"));
const customerImportController = __importStar(require("../controllers/customerImport"));
const serviceTicketController = __importStar(require("../controllers/serviceTicket"));
const quickBookController = __importStar(require("../controllers/quickbook"));
const companyController = __importStar(require("../controllers/company"));
const partController = __importStar(require("../controllers/part"));
const purchaseOrderController = __importStar(require("../controllers/purchaseOrder"));
const estimateController = __importStar(require("../controllers/estimate"));
const paymentController = __importStar(require("../controllers/payemnt"));
function default_1(sio) {
    const router = express_1.default.Router();
    //Auth
    router.post('/login', validator_1.validate(validator_1.Validations.login), userController.login);
    router.post('/subscribe', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), userController.companySubscribe);
    router.post('/agreeTermAndCondition', passport_1.default.authenticate('jwt', { session: false }), validator_1.validate(validator_1.Validations.agree), userController.agreeToTermAndConditions);
    router.post('/signup', validator_1.validate(validator_1.Validations.signUp), userController.createCompany);
    router.post('/adminSignUp', validator_1.validate(validator_1.Validations.adminSignUp), userController.createGlobalAdmin);
    router.post('/getDefaultPermissions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(1 /* Permission_Get_All */), permissionController.getAllPermissions);
    router.post('/updateDefaultPermissions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(6 /* Permission_Update_Default */), validator_1.validate(validator_1.Validations.updateDefaultPermissions), permissionController.updateDefaultPermissions);
    router.post('/getOfficeAdminPermissions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(2 /* Permission_Get_Office_Admin */), permissionController.getOfficeAdminPermissions);
    router.post('/getTechPermissions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(3 /* Permission_Get_Tech */), permissionController.getTechPermissions);
    router.post('/getManagerPermissions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(4 /* Permission_Get_Manager */), permissionController.getManagerPermissions);
    router.post('/updateUserPermissions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(7 /* Permission_Update_Employee */), validator_1.validate(validator_1.Validations.udpateUserPermissions), permissionController.updateUserPermissions);
    router.post('/getEmployeePermissions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(5 /* Permission_Get_Employee */), validator_1.validate(validator_1.Validations.employeePermissions), permissionController.getUserPermissions);
    //Industry
    router.post('/createIndustry', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(4 /* GLOBAL_ADMIN */), validator_1.validate(validator_1.Validations.createIndustry), industryController.createIndustry);
    router.post('/getIndustries', industryController.getIndustries);
    // router.post(
    //     '/removeIndustry',
    //     passport.authenticate('jwt', { session: false }),
    //     checkPermissions(Role.GLOBAL_ADMIN),
    //     validate(Validations.removeIndustry),
    //     industryController.removeIndustry
    // )
    //Users
    router.post('/createManager', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(8 /* User_Create_Manager */), validator_1.validate(validator_1.Validations.createManager), company_1.getCompnayId(), userController.createManager);
    router.post('/createTechnician', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(10 /* User_Create_Technician */), validator_1.validate(validator_1.Validations.createTechnician), company_1.getCompnayId(), userController.createTechnician);
    router.post('/createOfficeAdmin', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(12 /* User_Create_Office_Admin */), validator_1.validate(validator_1.Validations.createOfficeAdmin), company_1.getCompnayId(), userController.createOfficeAdmin);
    router.post('/getManagers', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(9 /* User_Get_Manager */), company_1.getCompnayId(), userController.getManagersList);
    router.post('/getTechnicians', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(11 /* User_Get_Technician */), company_1.getCompnayId(), userController.getTechniciansList);
    router.post('/getOfficeAdmins', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(13 /* User_Get_Office_Admin */), company_1.getCompnayId(), userController.getOfficeAdminsList);
    router.post('/updateProfile', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(14 /* User_Update_Profile */), validator_1.validate(validator_1.Validations.updateProfile), userController.updateProfile);
    router.post('/changePassword', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(15 /* User_Change_Password */), validator_1.validate(validator_1.Validations.changePassword), userController.changePassword);
    router.post('/forgotPassword', validator_1.validate(validator_1.Validations.forgotPassword), userController.fogotPassword);
    router.post('/deleteEmployee', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(16 /* User_Delete_Employee */), validator_1.validate(validator_1.Validations.deleteEmployee), userController.deleteEmployee);
    router.post('/activateEmployee', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(17 /* User_Activate_Employee */), validator_1.validate(validator_1.Validations.deleteEmployee), userController.activateEmployee);
    //Equipment types
    router.post('/createEquipmentType', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(21 /* Equipment_Type_Create */), validator_1.validate(validator_1.Validations.createEquipmentType), equipmentTypeController.createEquipmentType);
    router.post('/getEquipmentTypes', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(20 /* Equipment_Type_Get */), equipmentTypeController.getEquipmentTypes);
    //Equipment brands
    router.post('/createEquipmentBrand', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(23 /* Equipment_Brand_Create */), validator_1.validate(validator_1.Validations.createEquipmentBrand), equipmentBrandController.createEquipmentBrand);
    router.post('/getEquipmentBrands', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(22 /* Equipment_Brand_Get */), equipmentBrandController.getEquipmentBrands);
    //Customers
    router.post('/createCustomer', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(24 /* Customer_Create */), validator_1.validate(validator_1.Validations.createCustomer), customerController.createCustomer);
    router.post('/getCustomers', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(26 /* Customer_Get_All */), validator_1.validate(validator_1.Validations.getCustomers), customerController.getCustomers);
    router.post('/getCustomerDetail', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(77 /* Get_Customer_Detail */), validator_1.validate(validator_1.Validations.getCustomerDetail), customerController.customerDetail);
    router.post('/updateCustomer', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(25 /* Customer_Update */), validator_1.validate(validator_1.Validations.updateCustomer), customerController.updateCustomer);
    //Customer equipments
    router.post('/createCustomerEquipment', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(27 /* Customer_Equipment_Create */), validator_1.validate(validator_1.Validations.createCustomerEquipment), customerEquipmentController.createCustomerEquipment);
    router.post('/getCustomerEquipments', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(28 /* Customer_Equipment_Get_All */), validator_1.validate(validator_1.Validations.getCustomerEquipments), customerEquipmentController.getCustomerEquipments);
    router.post('/getCustomerEquipmentJobs', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(29 /* Customer_Equipment_Get_Jobs */), validator_1.validate(validator_1.Validations.getCustomerEquipmentJobs), customerEquipmentController.getCustomerEquipmentJobs);
    router.post('/getEquipmentInfo', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(28 /* Customer_Equipment_Get_All */), validator_1.validate(validator_1.Validations.getCustomerEquipmentInfo), customerEquipmentController.getCustomerEquipmentInfo);
    router.post('/getEquipmentJobs', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(28 /* Customer_Equipment_Get_All */), validator_1.validate(validator_1.Validations.getCustomerEquipmentInfo), customerEquipmentController.getEquipmentJobs);
    router.post('/scanJobEquipment', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(30 /* Customer_Equipment_Assign_Job */), validator_1.validate(validator_1.Validations.linkEquipmentJob), customerEquipmentController.linkJobToEquipment);
    router.post('/scanTag', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(81 /* Scan_Tag */), validator_1.validate(validator_1.Validations.getCustomerEquipmentJobs), customerEquipmentController.checkTagAssociation);
    //Job types
    router.post('/createJobType', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(31 /* Job_Type_Create */), validator_1.validate(validator_1.Validations.createJobType), jobTypeController.createJobType);
    router.post('/editJobType', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(31 /* Job_Type_Create */), validator_1.validate(validator_1.Validations.editJobType), jobTypeController.editJobType);
    router.post('/changeJobTypeStatus', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(31 /* Job_Type_Create */), validator_1.validate(validator_1.Validations.changeJobTypeStatus), jobTypeController.changeJobTypeStatus);
    router.post('/getJobTypes', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(32 /* Job_Type_Get */), jobTypeController.getJobTypes);
    router.post('/getItems', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(114 /* Get_Items */), jobTypeController.getAllItems);
    router.post('/updateItem', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(115 /* Update_Item */), validator_1.validate(validator_1.Validations.updateItem), jobTypeController.updateItem);
    //Job
    router.post('/createJob', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(33 /* Job_Create */), validator_1.validate(validator_1.Validations.createJob), jobController.createJob);
    router.post('/getJobs', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(34 /* Job_Get_All */), jobController.getJobs);
    router.post('/getTechnicianJobs', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(35 /* Job_Get_Technician */), validator_1.validate(validator_1.Validations.technicianJobs), jobController.getJobsByTechnicianId);
    router.post('/getTechnicianJobsToday', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(35 /* Job_Get_Technician */), validator_1.validate(validator_1.Validations.technicianJobs), jobController.getTodaysJobsByTechnicianId);
    router.post('/updateJob', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(36 /* Job_Update */), validator_1.validate(validator_1.Validations.updateJob), jobController.updateJob);
    router.post('/startJob', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(38 /* Job_Start */), validator_1.validate(validator_1.Validations.generalJob), jobController.startJob);
    router.post('/getJobDetails', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(40 /* Job_Detail */), validator_1.validate(validator_1.Validations.generalJob), jobController.getJobDetails);
    router.post('/editJob', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(37 /* Job_Edit */), validator_1.validate(validator_1.Validations.editJob), jobController.editJob);
    router.post('/updateJobTime', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(37 /* Job_Edit */), validator_1.validate(validator_1.Validations.updateJobTime), jobController.updateJobTime);
    router.post('/getJobReport', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(78 /* Get_Job_Report */), validator_1.validate(validator_1.Validations.getJobReport), jobController.getJobReport);
    //Image upload
    router.post('/uploadImage', passport_1.default.authenticate('jwt', { session: false }), 
    // getCompnayId(),
    permissions_1.checkUserPermissions(41 /* Image_Upload */), imageController.uploadImage);
    //Group
    router.post('/createGroup', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(42 /* Group_Create */), validator_1.validate(validator_1.Validations.createGroup), groupController.createGroup);
    router.post('/getGroups', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(43 /* Group_Get_All */), groupController.getGroups);
    router.post('/deleteGroup', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(44 /* Group_Delete */), validator_1.validate(validator_1.Validations.groupGeneric), groupController.deleteGroup);
    router.post('/addGroupManager', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(45 /* Group_Add_Manager */), validator_1.validate(validator_1.Validations.addManager), groupController.addManager);
    router.post('/addGroupMember', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(46 /* Group_Add_Member */), validator_1.validate(validator_1.Validations.memberGeneric), groupController.addMember);
    router.post('/removeGroupMember', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(47 /* Group_Remove_Member */), validator_1.validate(validator_1.Validations.memberGeneric), groupController.removeMember);
    //Company Equipment
    router.post('/createCompanyEquipment', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(48 /* Company_Equipment_Create */), validator_1.validate(validator_1.Validations.createCompanyEquipment), companyEquipmentController.createCompanyEquipment);
    router.post('/getCompanyEquipments', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(49 /* Company_Equipment_Get */), companyEquipmentController.getCompanyEquipments);
    // Company Equipment History
    router.post('/equipmentCheckInOut', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(50 /* Company_Equipment_Check_In_Out */), validator_1.validate(validator_1.Validations.createCompanyEquipmentHistory), companyEquipmentHistoryController.createCompanyEquipmentHistory);
    // Company Equipment Inventory
    router.post('/takeInventory', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(51 /* Inventory_Take */), validator_1.validate(validator_1.Validations.createEquipmentInventory), companyEquipmentInventoryController.createCompanyEquipmentInventory);
    router.post('/getInventoryReport', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(52 /* Inventory_Report */), companyEquipmentInventoryController.getIventoryHistory);
    // Company cards
    router.post('/addCompanyCard', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(53 /* Company_Card_Add */), validator_1.validate(validator_1.Validations.addCompanyCard), companyCardController.createCompanyCard);
    router.post('/removeCompanyCard', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(55 /* Company_Card_Remove */), validator_1.validate(validator_1.Validations.removeCompanyCard), companyCardController.removeCompanyCard);
    router.post('/getCompanyCards', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(54 /* Company_Card_Get */), companyCardController.getCompanyCards);
    // place tags orders
    router.post('/placeOrder', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(56 /* Tags_Place_Order */), validator_1.validate(validator_1.Validations.placeOrder), orderController.placeOrder);
    router.post('/getOrders', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(57 /* Tags_Get_Orders */), orderController.getOrders);
    router.post('/buySubscriptions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(58 /* Subscription_Buy */), validator_1.validate(validator_1.Validations.buySubscriptions), subscriptionController.addCompanySubscriptions);
    router.post('/cancelSubscriptions', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(59 /* Subscription_Cancel */), validator_1.validate(validator_1.Validations.buySubscriptions), subscriptionController.removeCompanySubscriptions);
    router.get('/chargeSubscription', subscriptionController.chargeCompanySubscription);
    // router.post(
    //     '/updateSubscription',
    //     userController.updateSub
    // )
    router.post('/contractorSignup', validator_1.validate(validator_1.Validations.contractorSignup), userController.createContractor);
    router.post('/searchContractor', validator_1.validate(validator_1.Validations.searchContractor), userController.searchContractor);
    router.post('/startContract', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(61 /* Invite_Contractor */), validator_1.validate(validator_1.Validations.inviteContractor), userController.startContract);
    router.post('/inviteContractor', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(61 /* Invite_Contractor */), validator_1.validate(validator_1.Validations.searchContractor), userController.inviteContractor);
    // limit only for contractors
    router.post('/getContracts', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(65 /* Get_All_Contracts */), userController.getAllContracts);
    // limit only for contractors
    router.post('/acceptOrRejectContract', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(62 /* Accept_Reject_Contract */), validator_1.validate(validator_1.Validations.updateContract), userController.acceptRejectContract);
    router.post('/CancelOrFinish', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(63 /* Cancel_Finish_Contract */), validator_1.validate(validator_1.Validations.updateContract), userController.cancelOrFinishContract);
    router.post('/changeContractorPermission', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(64 /* Add_Contractor_Permission */), validator_1.validate(validator_1.Validations.contractorPermissions), permissionController.addContractorPermissions);
    router.post('/upgradeToCompany', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkUserPermissions(67 /* Upgrade_To_Company */), validator_1.validate(validator_1.Validations.upgradeToCompany), userController.upgradeToCompany);
    router.post('/checkAndGet', validator_1.validate(validator_1.Validations.socialLogin), userController.checkAndGetUser);
    router.post('/signUpSocial', validator_1.validate(validator_1.Validations.socialSignUp), userController.createCompanySocial);
    router.post('/contractorSignUpSocial', validator_1.validate(validator_1.Validations.contractorSocialSignUp), userController.createContractorSocial);
    router.post('/importCustomer', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(70 /* Customer_Import */), 
    // validate(Validations.customerImport),
    customerImportController.uploadfile);
    // Service Ticket
    router.post('/getServiceTickets', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(71 /* Get_Service_Tickets */), serviceTicketController.getServiceTickets);
    router.post('/createServiceTicket', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(72 /* Create_Service_Ticket */), validator_1.validate(validator_1.Validations.createTicket), serviceTicketController.createServiceTicket);
    router.post('/editServiceTicket', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(73 /* Edit_Service_Ticket */), validator_1.validate(validator_1.Validations.editTicket), serviceTicketController.editServiceTicket);
    router.post('/updateServiceTicket', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(74 /* Update_Service_Ticket */), validator_1.validate(validator_1.Validations.updateTicket), serviceTicketController.updateServiceTicket);
    router.post('/getServiceTicketDetail', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(75 /* Get_Ticket_Detail */), validator_1.validate(validator_1.Validations.getTicketDetail), serviceTicketController.getServiceTicketDetail);
    // Quickbooks
    router.post('/getQBCustomers', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(79 /* Get_QB_Customers */), 
    // validate(Validations.getQBCustomers),
    quickBookController.getQBCustomers);
    router.post('/syncQBCustomers', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(79 /* Get_QB_Customers */), 
    // validate(Validations.getQBCustomers),
    quickBookController.syncQBCustomers);
    router.post('/createQBCustomer', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(80 /* Create_QB_customer */), validator_1.validate(validator_1.Validations.createQBCustomer), quickBookController.createQBCustomer);
    router.post('/getQBUri', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(83 /* Get_QB_Uri */), quickBookController.getQBUri);
    router.get('/callback', (req, res) => {
        quickBookController.getCallBackToken(req, res, sio);
    });
    // Company
    router.post('/getContractorsForJob', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(76 /* Get_Contractors_For_Job */), companyController.getContractorForJob);
    router.post('/getCompanyContracts', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(66 /* Get_Company_Contracts */), companyController.getCompanyContracts);
    router.post('/updateCompanyProfile', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(19 /* Update_Company_Profile */), validator_1.validate(validator_1.Validations.updateCompanyProfile), companyController.updateCompanyProfile);
    router.post('/setCustomWorkOrderNumber', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(69 /* Custom_work_Order_Number */), companyController.setCustomWorkNumber);
    router.post('/getCurrentJobId', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(82 /* Get_Custom_Work_No */), companyController.getCustomWorkNumber);
    router.post('/getSyncInfo', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(82 /* Get_Custom_Work_No */), companyController.getSyncInfo);
    router.post('/getAllEmployees', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(18 /* User_Get_All_Employees */), companyController.getAllEmployees);
    router.post('/getEmployeesForJob', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(18 /* User_Get_All_Employees */), companyController.getEmployeesForJob);
    router.get('/downgradeCompanies', companyController.downgradeCompanies);
    router.post('/setCustomInvoiceNumber', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(89 /* Set_Invoice_Number */), companyController.setCustomInvoiceNumber);
    router.post('/getCurrentIvoiceNumber', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(90 /* Get_Current_Invoice_Number */), companyController.getInvoiceNumber);
    // Sales Taxes
    router.post('/createSalesTax', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(85 /* Create_Sales_Tax */), validator_1.validate(validator_1.Validations.createSaleTax), companyController.createSalesTax);
    router.post('/updateSalesTax', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(86 /* Update_Sales_Tax */), validator_1.validate(validator_1.Validations.updateSaleTax), companyController.updateSalesTax);
    router.post('/deleteSalesTax', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(87 /* Delete_Sales_Tax */), validator_1.validate(validator_1.Validations.deleteSaleTax), companyController.deleteSalesTax);
    router.post('/getSalesTax', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(88 /* Get_Sales_Taxes */), companyController.getSalesTaxes);
    // Job Charges
    router.post('/createJobCharges', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(91 /* Create_Job_Charges */), validator_1.validate(validator_1.Validations.createJobCharges), companyController.createJobCharges);
    router.post('/updateJobCharges', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(92 /* Update_Job_Charges */), validator_1.validate(validator_1.Validations.updateJobCharges), companyController.updateJobCharges);
    router.post('/deleteJobCharges', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(93 /* Delete_Job_Charges */), validator_1.validate(validator_1.Validations.deleteJobCharges), companyController.deleteJobCharges);
    router.post('/getJobCharges', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(94 /* Get_Job_Charges */), companyController.getJobCharges);
    // Invoice
    router.post('/createInvoice', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(95 /* Create_Invoice */), 
    //validate(Validations.createInvoice),
    companyController.createInvoice);
    router.post('/createPOInvoice', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(95 /* Create_Invoice */), validator_1.validate(validator_1.Validations.createPOInvoice), companyController.createPOInvoice);
    router.post('/updateInvoice', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(96 /* Update_Invoice */), validator_1.validate(validator_1.Validations.updateInvoice), companyController.updateInvoice);
    router.post('/getInvoiceDetail', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(97 /* Get_Invoice_Detail */), companyController.getInvoiceDetail);
    router.post('/getInvoices', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(98 /* Get_Invoices */), companyController.getInvoices);
    router.post('/updateCompaniesDefaultPermissions', permissionController.updateAllCompaniesPermissions);
    //Parts Inventory
    router.post('/getParts', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(99 /* Get_Parts */), partController.getPartInventory);
    router.post('/createPart', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(100 /* Create_Part */), validator_1.validate(validator_1.Validations.createPartInventory), partController.createPartInventory);
    router.post('/updatePart', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(101 /* Update_Part */), validator_1.validate(validator_1.Validations.udpatePartInventory), partController.updatePartInventory);
    router.post('/removePart', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(102 /* Remove_Part */), validator_1.validate(validator_1.Validations.removePartInventory), partController.removePartInventory);
    // Purchase Order
    router.post('/createPurchaseOrder', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(103 /* Create_Purchase_Order */), validator_1.validate(validator_1.Validations.createPurchaseOrder), purchaseOrderController.createPO);
    router.post('/getAllPurchaseOrder', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(107 /* Get_Purchase_Order */), purchaseOrderController.getAllPO);
    router.post('/getEquipmentPurchaseOrder', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), validator_1.validate(validator_1.Validations.getEquipmentPO), permissions_1.checkUserPermissions(116 /* Get_Equipment_Purchase_Order */), purchaseOrderController.getAllEquipmentPurchaseOrder);
    router.post('/updatePurchaseOrderStatus', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(105 /* Update_Status_Purchase_Order */), validator_1.validate(validator_1.Validations.udpatePurchaseOrderStatus), purchaseOrderController.updatePOStatus);
    router.post('/createPOEstimate', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(106 /* Create_Purchase_Order_From_Estimate */), validator_1.validate(validator_1.Validations.createPurchaseOrderEstimate), purchaseOrderController.createPOEstimate);
    router.post('/updatePurchaseOrder', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(104 /* Update_Purchase_Order */), validator_1.validate(validator_1.Validations.udpatePurchaseOrder), purchaseOrderController.updatePO);
    router.post('/updateEstimate', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(109 /* Update_Estimate */), validator_1.validate(validator_1.Validations.udpateEstimate), estimateController.updateEstimate);
    router.post('/updateEstimateStatus', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(110 /* Update_Status_Estimate */), validator_1.validate(validator_1.Validations.udpateEstimateStatus), estimateController.updateEstimateStatus);
    router.post('/createEstimate', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(108 /* Create_Estimate */), estimateController.createEstimate);
    router.post('/getEstimate', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(111 /* Get_Estimate */), estimateController.getEstimates);
    router.post('/cancelEstimate', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), validator_1.validate(validator_1.Validations.cancelEstimate), permissions_1.checkUserPermissions(112 /* Cancel_Estimate */), estimateController.cancelEstimate);
    router.post('/getCompanyContractorActivity', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(113 /* Get_Company_Contractor_Activity */), companyController.getCompanyContractorActivity);
    router.post('/getInvoiceByCustomerId', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), validator_1.validate(validator_1.Validations.getInvoiceByCustomer), permissions_1.checkUserPermissions(117 /* Get_Customer_Invoices */), companyController.getInvoicesByCustomerId);
    router.post('/recordPayment', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), validator_1.validate(validator_1.Validations.recordPayment), permissions_1.checkUserPermissions(118 /* Create_Payment */), paymentController.createPayment);
    router.post('/updatePayment', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), validator_1.validate(validator_1.Validations.updatePayment), permissions_1.checkUserPermissions(119 /* Update_Payment */), paymentController.udpatePayment);
    router.post('/getPaymentsByCustomerId', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), validator_1.validate(validator_1.Validations.getPaymentsByCustomer), permissions_1.checkUserPermissions(120 /* Get_Customer_Payments */), paymentController.getPaymentsByCustomerId);
    router.post('/getPayments', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompnayId(), permissions_1.checkUserPermissions(121 /* Get_Payments */), paymentController.getPayments);
    return router;
}
exports.default = default_1;
//# sourceMappingURL=v1.js.map