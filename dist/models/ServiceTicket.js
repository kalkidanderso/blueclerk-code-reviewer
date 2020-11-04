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
const ServiceTicketSchema = new mongoose_1.Schema({
    createdAt: Date,
    scheduleDate: {
        type: Date,
        required: false
    },
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    note: String,
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    technician: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    status: {
        type: Number,
        default: 0
    },
    editedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    editedAt: {
        type: Date
    },
    ticketId: String,
    jobSite: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'JobSite',
    },
    jobCreated: {
        type: Boolean,
        default: false
    }
});
exports.ServiceTicket = mongoose_1.default.model('ServiceTicket', ServiceTicketSchema);
//# sourceMappingURL=ServiceTicket.js.map