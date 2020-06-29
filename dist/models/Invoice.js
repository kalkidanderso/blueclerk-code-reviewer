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
const InvoiceSchema = new mongoose_1.Schema({
    invoiceId: String,
    // 0 for job invoice
    // 1 for PO invoice
    invoiceType: {
        type: Number,
        default: 0
    },
    job: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Job',
        required: false
    },
    purchaseOrder: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: false
    },
    jobPurchaseOrders: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'PurchaseOrder',
            required: false
        }],
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    charges: {
        type: Number,
        default: 0
    },
    total: {
        type: Number
    },
    tax: {
        type: Number,
        default: 0
    },
    taxPercentage: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    timeSpent: {
        type: Number,
        default: 0
    },
    isFixed: {
        type: Boolean,
        default: false
    },
    hourlyRate: {
        type: Number,
        default: 0
    },
});
exports.Invoice = mongoose_1.default.model('Invoice', InvoiceSchema);
//# sourceMappingURL=Invoice.js.map