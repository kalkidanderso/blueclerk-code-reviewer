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
    jobId: String,
    ticket: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'ServiceTicket',
        required: true
    },
    equipmentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        required: false
    },
    technician: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
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
    description: {
        type: String
    },
    status: {
        type: Number,
        default: 0
    },
    comment: {
        type: String
    },
    createdAt: {
        type: Date
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // employee type 0 for company employee
    // employee type 1 for external employee
    employeeType: {
        type: Boolean,
        default: false
    },
    // isFixed: {
    //     type: Boolean,
    //     default: true
    // },
    // hourlyRate:{
    //     type: Number,
    //     default: 0
    // },
    charges: {
        type: Number,
        default: 0
    },
    salesTax: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'SaleTax',
        required: false
    },
    startTime: Date,
    endTime: Date,
    timeSpent: {
        type: Number,
        default: 0
    },
    timeUpdatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    timeUpdatedAt: {
        type: Date
    },
    equipment_scanned: {
        type: Boolean,
        default: false
    },
    no_of_equipment_scanned: {
        type: Number,
        default: 0
    },
    endsAt: {
        type: Date,
        required: true
    },
    completeOnTime: {
        type: Boolean,
        required: false
    }
});
exports.Job = mongoose_1.default.model('Job', JobSchema);
//# sourceMappingURL=Job.js.map