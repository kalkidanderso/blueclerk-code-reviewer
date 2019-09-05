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
const userController = __importStar(require("../controllers/user"));
const router = express_1.default.Router();
//Users
router.post('/signup', validator_1.validate(validator_1.Validations.signUp), userController.createSubscriber);
router.post('/login', validator_1.validate(validator_1.Validations.login), userController.login);
router.post('/adminSignUp', validator_1.validate(validator_1.Validations.login), userController.createGlobalAdmin);
router.post('/createManager', passport_1.default.authenticate('jwt', { session: false }), validator_1.validate(validator_1.Validations.login), userController.createManager);
router.post('/createTechnician', passport_1.default.authenticate('jwt', { session: false }), validator_1.validate(validator_1.Validations.login), userController.createTechnician);
router.post('/createOfficeAdmin', passport_1.default.authenticate('jwt', { session: false }), validator_1.validate(validator_1.Validations.login), userController.createOfficeAdmin);
router.post('/getManagers', passport_1.default.authenticate('jwt', { session: false }), userController.getManagersList);
router.post('/getTechnicians', passport_1.default.authenticate('jwt', { session: false }), userController.getTechniciansList);
router.post('/getOfficeAdmins', passport_1.default.authenticate('jwt', { session: false }), userController.getOfficeAdminsList);
exports.default = router;
//# sourceMappingURL=v1.js.map