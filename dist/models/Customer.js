"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User_1 = require("./User");
const CustomerSchema = new mongoose_1.Schema({
    isActive: { type: Boolean, default: true },
    info: {
        email: String
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    equipments: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'CustomerEquipment' }],
    quickbookId: {
        type: String,
        default: null
    }
});
exports.Customer = User_1.User.discriminator('Customer', CustomerSchema);
//# sourceMappingURL=Customer.js.map