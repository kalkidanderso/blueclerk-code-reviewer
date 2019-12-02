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
const CustomerSchema = new mongoose_1.Schema({
    info: {
        name: String,
        email: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    contact: {
        name: String,
        phone: String,
    },
    isActive: { type: Boolean, default: true },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    equipments: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'CustomerEquipment' }],
});
exports.Customer = mongoose_1.default.model('Customer', CustomerSchema);
//# sourceMappingURL=Customer.js.map