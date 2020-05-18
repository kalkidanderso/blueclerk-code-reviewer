"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const JobChargesSchema = new mongoose_1.Schema({
    charges: Number,
    // true for fixed
    // false for hourly
    isFixed: {
        type: Boolean,
        default: true
    },
    jobType: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'JobType',
        required: true
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date
    }
});
exports.JobCharges = mongoose_1.default.model('JobCharges', JobChargesSchema);
//# sourceMappingURL=JobCharges.js.map