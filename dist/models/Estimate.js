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
const EstimateSchema = new mongoose_1.Schema({
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
            price: {
                type: Number,
                required: false
            }
        }],
    note: {
        type: String,
        required: true
    },
    total: {
        type: Number
    },
    // 0 => pending
    // 1 => approved by customer
    // 2 => declined/rejected by customer
    status: {
        type: Number,
        default: 0
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
    }
});
exports.Estimate = mongoose_1.default.model('Estimate', EstimateSchema);
//# sourceMappingURL=Estimate.js.map