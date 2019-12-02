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
const JobSchema = new mongoose_1.Schema({
    dateTime: Date,
    technician: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    type: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'JobType',
        required: true
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    equipmentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        default: null
    },
    comment: {
        type: String
    },
    description: {
        type: String
    },
    status: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date
    },
    timeOfScan: {
        type: Date
    },
});
exports.Job = mongoose_1.default.model('Job', JobSchema);
//# sourceMappingURL=Job.js.map