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
const userController = __importStar(require("../controllers/user"));
const jobTypeController = __importStar(require("../controllers/jobType"));
const equipmentTypeController = __importStar(require("../controllers/equipmentType"));
const equipmentBrandController = __importStar(require("../controllers/equipmentBrand"));
const customerController = __importStar(require("../controllers/customer"));
const customerEquipmentController = __importStar(require("../controllers/customerEquipment"));
const industryController = __importStar(require("../controllers/industry"));
const jobController = __importStar(require("../controllers/job"));
const router = express_1.default.Router();
//Auth
router.post('/login', validator_1.validate(validator_1.Validations.login), userController.login);
router.post('/signup', validator_1.validate(validator_1.Validations.signUp), userController.createSubscriber);
router.post('/adminSignUp', validator_1.validate(validator_1.Validations.adminSignUp), userController.createGlobalAdmin);
//Industry
router.post('/createIndustry', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(4 /* GLOBAL_ADMIN */), validator_1.validate(validator_1.Validations.createIndustry), industryController.createIndustry);
router.post('/getIndustries', industryController.getIndustries);
//Users
router.post('/createManager', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.createManager), userController.createManager);
router.post('/createTechnician', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.createTechnician), userController.createTechnician);
router.post('/createOfficeAdmin', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.createOfficeAdmin), userController.createOfficeAdmin);
router.post('/getManagers', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), userController.getManagersList);
router.post('/getTechnicians', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), userController.getTechniciansList);
router.post('/getOfficeAdmins', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), userController.getOfficeAdminsList);
router.post('/updateProfile', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.updateProfile), userController.updateProfile);
router.post('/changePassword', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.changePassword), userController.changePassword);
router.post('/updateCompanyProfile', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.updateCompanyProfile), userController.updateCompanyProfile);
//Equipment types
router.post('/createEquipmentType', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.createEquipmentType), equipmentTypeController.createEquipmentType);
router.post('/getEquipmentTypes', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), equipmentTypeController.getEquipmentTypes);
//Equipment brands
router.post('/createEquipmentBrand', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.createEquipmentBrand), equipmentBrandController.createEquipmentBrand);
router.post('/getEquipmentBrands', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), equipmentBrandController.getEquipmentBrands);
//Customers
router.post('/createCustomer', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.createCustomer), customerController.createCustomer);
router.post('/getCustomers', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.getCustomers), customerController.getCustomers);
//Customer equipments
router.post('/createCustomerEquipment', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(1 /* TECHNICIAN */), validator_1.validate(validator_1.Validations.createCustomerEquipment), customerEquipmentController.createCustomerEquipment);
router.post('/getCustomerEquipments', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), validator_1.validate(validator_1.Validations.getCustomerEquipments), customerEquipmentController.getCustomerEquipments);
//Job types
router.post('/createJobType', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.createJobType), jobTypeController.createJobType);
router.post('/getJobTypes', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), jobTypeController.getJobTypes);
//Job
router.post('/createJob', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(3 /* SUBSCRIBER */), validator_1.validate(validator_1.Validations.createJob), jobController.createJob);
router.post('/getJobs', passport_1.default.authenticate('jwt', { session: false }), permissions_1.checkPermissions(0 /* OFFICE_ADMIN */), jobController.getJobs);
exports.default = router;
//# sourceMappingURL=v1.js.map