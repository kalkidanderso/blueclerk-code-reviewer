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
const PurcahseOrderSchema = new mongoose_1.Schema({
    purchaseOrderId: {
        type: String
    },
    items: [{
            part: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Part',
                required: false
            },
            name: {
                type: String,
                required: false
            },
            itemCode: {
                type: String,
                required: false
            },
            quantity: {
                type: Number,
                required: false
            },
            cost: {
                type: Number,
                required: false
            },
            tax: {
                type: Number,
                default: 0
            },
            taxPercentage: {
                type: Number,
                default: 0
            },
            price: {
                type: Number,
                required: false
            }
        }],
    note: {
        type: String,
    },
    total: {
        type: Number
    },
    estimate: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Estimate',
        required: false
    },
    equipment: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        required: false
    },
    // 0 => pending
    // 1 => approved by customer
    // 2 => declined/rejected by customer
    status: {
        type: Number,
        default: 1
    },
    job: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Job',
        required: false
    },
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
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date
    },
    invoiceCreated: {
        type: Boolean,
        default: false
    },
    estimateConverted: {
        type: Boolean,
        default: false
    }
});
exports.PurchaseOrder = mongoose_1.default.model('PurchaseOrder', PurcahseOrderSchema);
//# sourceMappingURL=PurchaseOrder.js.map