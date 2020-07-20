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
const PartSchema = new mongoose_1.Schema({
    name: String,
    itemCode: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false
    },
    cost: {
        type: Number
    },
    price: {
        type: Number
    },
    totalQuantity: {
        type: Number
    },
    availableQuantity: {
        type: Number
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
exports.Part = mongoose_1.default.model('Part', PartSchema);
//# sourceMappingURL=Part.js.map