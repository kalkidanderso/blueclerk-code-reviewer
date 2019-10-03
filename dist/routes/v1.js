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
const companyEquipment = __importStar(require("../controllers/companyEquipment"));
// import * as orderController from '../controllers/order'
const companyEquipmentHistory = __importStar(require("../controllers/companyEquipmentHistory"));
const companyEquipmentInventory = __importStar(require("../controllers/companyEquipmentInventory"));
const router = express_1.default.Router();
//Auth
router.post('/login', validator_1.validate(validator_1.Validations.login), userController.login);
router.post('/signup', validator_1.validate(validator_1.Validations.signUp), userController.createCompany);
router.post('/adminSignUp', validator_1.validate(validator_1.Validations.adminSignUp), userController.createGlobalAdmin);
//Industry
router.post('/createIndustry', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(4 /* GLOBAL_ADMIN */), validator_1.validate(validator_1.Validations.createIndustry), industryController.createIndustry);
router.post('/getIndustries', industryController.getIndustries);
//Users
router.post('/createManager', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createManager), company_1.getCompnayId(), userController.createManager);
router.post('/createTechnician', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createTechnician), company_1.getCompnayId(), userController.createTechnician);
router.post('/createOfficeAdmin', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createOfficeAdmin), company_1.getCompnayId(), userController.createOfficeAdmin);
router.post('/getManagers', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), company_1.getCompnayId(), userController.getManagersList);
router.post('/getTechnicians', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), company_1.getCompnayId(), userController.getTechniciansList);
router.post('/getOfficeAdmins', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), company_1.getCompnayId(), userController.getOfficeAdminsList);
router.post('/updateProfile', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.updateProfile), userController.updateProfile);
router.post('/changePassword', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.changePassword), userController.changePassword);
router.post('/updateCompanyProfile', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.updateCompanyProfile), company_1.getCompnayId(), userController.updateCompanyProfile);
//Equipment types
router.post('/createEquipmentType', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createEquipmentType), equipmentTypeController.createEquipmentType);
router.post('/getEquipmentTypes', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), equipmentTypeController.getEquipmentTypes);
//Equipment brands
router.post('/createEquipmentBrand', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createEquipmentBrand), equipmentBrandController.createEquipmentBrand);
router.post('/getEquipmentBrands', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), equipmentBrandController.getEquipmentBrands);
//Customers
router.post('/createCustomer', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createCustomer), company_1.getCompnayId(), customerController.createCustomer);
router.post('/getCustomers', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.getCustomers), company_1.getCompnayId(), customerController.getCustomers);
router.post('/updateCustomer', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.updateCustomer), customerController.updateCustomer);
//Customer equipments
router.post('/createCustomerEquipment', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(1 /* TECHNICIAN */), validator_1.validate(validator_1.Validations.createCustomerEquipment), customerEquipmentController.createCustomerEquipment);
router.post('/getCustomerEquipments', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.getCustomerEquipments), customerEquipmentController.getCustomerEquipments);
router.post('/getCustomerEquipmentJobs', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(1 /* TECHNICIAN */), validator_1.validate(validator_1.Validations.getCustomerEquipmentJobs), company_1.getCompnayId(), customerEquipmentController.getCustomerEquipmentJobs);
router.post('/assignJobToEquipment', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(1 /* TECHNICIAN */), validator_1.validate(validator_1.Validations.linkEquipmentJob), customerEquipmentController.linkEquipmentJob);
//Job types
router.post('/createJobType', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createJobType), jobTypeController.createJobType);
router.post('/getJobTypes', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), company_1.getCompnayId(), jobTypeController.getJobTypes);
//Job
router.post('/createJob', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.createJob), company_1.getCompnayId(), jobController.createJob);
router.post('/getJobs', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), company_1.getCompnayId(), jobController.getJobs);
router.post('/updateJob', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(1 /* TECHNICIAN */), validator_1.validate(validator_1.Validations.updateJob), jobController.updateJob);
//Image upload
router.post('/uploadImage', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), imageController.uploadImage);
//Group
router.post('/createGroup', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createGroup), company_1.getCompnayId(), groupController.createGroup);
router.post('/getGroups', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), company_1.getCompnayId(), groupController.getGroups);
router.post('/deleteGroup', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.groupGeneric), groupController.deleteGroup);
router.post('/addGroupManager', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.addManager), company_1.getCompnayId(), groupController.addManager);
router.post('/addGroupMember', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.memberGeneric), company_1.getCompnayId(), groupController.addMember);
router.post('/removeGroupMember', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.memberGeneric), company_1.getCompnayId(), groupController.removeMember);
//Company Equipment
router.post('/createComapnyEquipment', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* COMPANY */), validator_1.validate(validator_1.Validations.createCompanyEquipment), company_1.getCompnayId(), companyEquipment.createCompanyEquipment);
router.post('/getCompanyEquipments', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), company_1.getCompnayId(), companyEquipment.getCompanyEquipments);
// Company Equipment History
router.post('/equipmentCheckInOut', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.createCompanyEquipmentHistory), companyEquipmentHistory.createCompanyEquipmentHistory);
// Company Equipment Inventory
router.post('/takeInventory', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.createEquipmentInventory), companyEquipmentInventory.createCompanyEquipmentInventory);
// router.post(
//     '/getInventoryReport',
//     passport.authenticate('jwt', { session: false }),
//     checkPermissions(Role.OFFICE_ADMIN),
//     companyEquipmentInventory.getIventoryHistory
// )
// place tags orders
// router.post(
//     '/placeOrder',
//     passport.authenticate('jwt', { session: false }),
//     checkPermissions(Role.COMPANY),
//     validate(Validations.placeOrder),
//     getCompnayId(),
//     orderController.placeOrder
// )
// router.post(
//     '/getOrders',
//     passport.authenticate('jwt', { session: false }),
//     checkPermissions(Role.COMPANY),
//     getCompnayId(),
//     orderController.getOrders
// )
// router.post(
//     '/updateOrder',
//     passport.authenticate('jwt', { session: false }),
//     checkPermissions(Role.COMPANY),
//     validate(Validations.udpateOrder),
//     getCompnayId(),
//     orderController.updateOrder
// )
// router.post(
//     '/createStripCustomer',
//     passport.authenticate('jwt', { session: false }),
//     orderController.createCustomer
// )
exports.default = router;
//# sourceMappingURL=v1.js.map