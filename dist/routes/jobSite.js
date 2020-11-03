"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const company_1 = require("../middleware/company");
const jobSite_1 = require("../controllers/jobSite");
const router = express_1.default.Router();
router.post('/', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompanyId(), jobSite_1.create);
router.put('/:id', passport_1.default.authenticate('jwt', { session: false }), company_1.getCompanyId(), jobSite_1.update);
router.get('/:id?', jobSite_1.get);
exports.default = router;
//# sourceMappingURL=jobSite.js.map